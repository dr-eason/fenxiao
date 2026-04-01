package model

import (
	"database/sql"
	"fenxiao/db"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Order struct {
	ID         int64      `json:"id"`
	OrderNo    string     `json:"order_no"`
	UserID     int64      `json:"user_id"`
	CodeTypeID int64      `json:"code_type_id"`
	Quantity   int        `json:"quantity"`
	TotalPrice int64      `json:"total_price"`
	Status     int        `json:"status"` // 0=pending, 1=paid, 2=cancelled
	PaidAt     *time.Time `json:"paid_at"`
	CreatedAt  time.Time  `json:"created_at"`
	// Joined fields
	CodeTypeName string `json:"code_type_name,omitempty"`
	UserPhone    string `json:"user_phone,omitempty"`
}

func CreateOrder(userID, codeTypeID int64, quantity int) (*Order, error) {
	codeType, err := GetCodeType(codeTypeID)
	if err != nil {
		return nil, fmt.Errorf("product not found")
	}

	// Check available codes
	var available int
	db.DB.QueryRow(`SELECT COUNT(*) FROM auth_code WHERE code_type_id = ? AND status = 0`, codeTypeID).Scan(&available)
	if available < quantity {
		return nil, fmt.Errorf("库存不足，当前可用: %d", available)
	}

	orderNo := fmt.Sprintf("ORD%s", uuid.New().String()[:8])
	totalPrice := codeType.Price * int64(quantity)

	result, err := db.DB.Exec(
		`INSERT INTO "order" (order_no, user_id, code_type_id, quantity, total_price, status) VALUES (?, ?, ?, ?, ?, 0)`,
		orderNo, userID, codeTypeID, quantity, totalPrice,
	)
	if err != nil {
		return nil, err
	}

	id, _ := result.LastInsertId()
	return &Order{
		ID: id, OrderNo: orderNo, UserID: userID, CodeTypeID: codeTypeID,
		Quantity: quantity, TotalPrice: totalPrice, Status: 0,
	}, nil
}

func PayOrder(orderID int64) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Get order
	var o Order
	var paidAt sql.NullTime
	err = tx.QueryRow(
		`SELECT id, order_no, user_id, code_type_id, quantity, total_price, status FROM "order" WHERE id = ? AND status = 0`, orderID,
	).Scan(&o.ID, &o.OrderNo, &o.UserID, &o.CodeTypeID, &o.Quantity, &o.TotalPrice, &o.Status)
	if err != nil {
		return fmt.Errorf("订单不存在或已支付")
	}
	_ = paidAt

	// Mark order as paid
	now := time.Now()
	if _, err := tx.Exec(`UPDATE "order" SET status = 1, paid_at = ? WHERE id = ?`, now, o.ID); err != nil {
		return err
	}

	// Assign auth codes
	rows, err := tx.Query(
		`SELECT id FROM auth_code WHERE code_type_id = ? AND status = 0 LIMIT ?`, o.CodeTypeID, o.Quantity,
	)
	if err != nil {
		return err
	}
	var codeIDs []int64
	for rows.Next() {
		var cid int64
		rows.Scan(&cid)
		codeIDs = append(codeIDs, cid)
	}
	rows.Close()

	if len(codeIDs) < o.Quantity {
		return fmt.Errorf("库存不足")
	}

	for _, cid := range codeIDs {
		if _, err := tx.Exec(`UPDATE auth_code SET order_id = ?, user_id = ?, status = 1 WHERE id = ?`, o.ID, o.UserID, cid); err != nil {
			return err
		}
	}

	// Promote to distributor
	if _, err := tx.Exec(`UPDATE user SET is_distributor = 1 WHERE id = ?`, o.UserID); err != nil {
		return err
	}

	// Calculate commissions
	if err := calculateCommissions(tx, &o); err != nil {
		return err
	}

	return tx.Commit()
}

func calculateCommissions(tx *sql.Tx, order *Order) error {
	// Get code type for commission rates
	var commL1, commL2 int64
	if err := tx.QueryRow(`SELECT commission_l1, commission_l2 FROM code_type WHERE id = ?`, order.CodeTypeID).Scan(&commL1, &commL2); err != nil {
		return err
	}

	// Get buyer's referrer (level-1 upline)
	var referrerID sql.NullInt64
	tx.QueryRow(`SELECT referrer_id FROM user WHERE id = ?`, order.UserID).Scan(&referrerID)

	if !referrerID.Valid {
		return nil // no upline, no commissions
	}

	// Check L1 upline is a distributor
	var l1IsDistributor int
	tx.QueryRow(`SELECT is_distributor FROM user WHERE id = ?`, referrerID.Int64).Scan(&l1IsDistributor)
	if l1IsDistributor == 1 && commL1 > 0 {
		_, err := tx.Exec(
			`INSERT INTO commission (user_id, order_id, from_user_id, level, amount) VALUES (?, ?, ?, 1, ?)`,
			referrerID.Int64, order.ID, order.UserID, commL1*int64(order.Quantity),
		)
		if err != nil {
			return err
		}
	}

	// Get L2 upline (referrer's referrer)
	var l2ReferrerID sql.NullInt64
	tx.QueryRow(`SELECT referrer_id FROM user WHERE id = ?`, referrerID.Int64).Scan(&l2ReferrerID)

	if !l2ReferrerID.Valid {
		return nil
	}

	var l2IsDistributor int
	tx.QueryRow(`SELECT is_distributor FROM user WHERE id = ?`, l2ReferrerID.Int64).Scan(&l2IsDistributor)
	if l2IsDistributor == 1 && commL2 > 0 {
		_, err := tx.Exec(
			`INSERT INTO commission (user_id, order_id, from_user_id, level, amount) VALUES (?, ?, ?, 2, ?)`,
			l2ReferrerID.Int64, order.ID, order.UserID, commL2*int64(order.Quantity),
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func GetOrdersByUser(userID int64) ([]Order, error) {
	rows, err := db.DB.Query(`
		SELECT o.id, o.order_no, o.user_id, o.code_type_id, o.quantity, o.total_price, o.status, o.paid_at, o.created_at, ct.name
		FROM "order" o LEFT JOIN code_type ct ON o.code_type_id = ct.id
		WHERE o.user_id = ? ORDER BY o.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanOrders(rows)
}

func GetAllOrders() ([]Order, error) {
	rows, err := db.DB.Query(`
		SELECT o.id, o.order_no, o.user_id, o.code_type_id, o.quantity, o.total_price, o.status, o.paid_at, o.created_at, ct.name
		FROM "order" o LEFT JOIN code_type ct ON o.code_type_id = ct.id
		ORDER BY o.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanOrders(rows)
}

func scanOrders(rows *sql.Rows) ([]Order, error) {
	var orders []Order
	for rows.Next() {
		var o Order
		var paidAt sql.NullTime
		var ctName sql.NullString
		if err := rows.Scan(&o.ID, &o.OrderNo, &o.UserID, &o.CodeTypeID, &o.Quantity, &o.TotalPrice, &o.Status, &paidAt, &o.CreatedAt, &ctName); err != nil {
			return nil, err
		}
		if paidAt.Valid {
			o.PaidAt = &paidAt.Time
		}
		if ctName.Valid {
			o.CodeTypeName = ctName.String
		}
		orders = append(orders, o)
	}
	return orders, nil
}
