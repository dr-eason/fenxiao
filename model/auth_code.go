package model

import (
	"database/sql"
	"fenxiao/db"
	"fmt"
	"math/rand"
	"time"
)

type AuthCode struct {
	ID         int64     `json:"id"`
	Code       string    `json:"code"`
	CodeTypeID int64     `json:"code_type_id"`
	OrderID    *int64    `json:"order_id"`
	UserID     *int64    `json:"user_id"`
	Status     int       `json:"status"` // 0=available, 1=sold, 2=used
	CreatedAt  time.Time `json:"created_at"`
}

func GenerateAuthCodes(codeTypeID int64, count int) (int, error) {
	// Verify code type exists
	if _, err := GetCodeType(codeTypeID); err != nil {
		return 0, fmt.Errorf("产品类型不存在")
	}

	generated := 0
	for i := 0; i < count; i++ {
		code := generateRandomCode()
		_, err := db.DB.Exec(
			`INSERT INTO auth_code (code, code_type_id, status) VALUES (?, ?, 0)`,
			code, codeTypeID,
		)
		if err != nil {
			continue // skip duplicates
		}
		generated++
	}
	return generated, nil
}

func generateRandomCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 16)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return fmt.Sprintf("%s-%s-%s-%s", string(b[0:4]), string(b[4:8]), string(b[8:12]), string(b[12:16]))
}

func GetAuthCodesByOrder(orderID int64) ([]AuthCode, error) {
	rows, err := db.DB.Query(
		`SELECT id, code, code_type_id, order_id, user_id, status, created_at FROM auth_code WHERE order_id = ?`, orderID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAuthCodes(rows)
}

func GetAuthCodesByType(codeTypeID int64, status int) ([]AuthCode, error) {
	rows, err := db.DB.Query(
		`SELECT id, code, code_type_id, order_id, user_id, status, created_at FROM auth_code WHERE code_type_id = ? AND status = ? ORDER BY id DESC`,
		codeTypeID, status,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAuthCodes(rows)
}

func GetAllAuthCodes(limit, offset int) ([]AuthCode, error) {
	rows, err := db.DB.Query(
		`SELECT id, code, code_type_id, order_id, user_id, status, created_at FROM auth_code ORDER BY id DESC LIMIT ? OFFSET ?`,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAuthCodes(rows)
}

func scanAuthCodes(rows *sql.Rows) ([]AuthCode, error) {
	var codes []AuthCode
	for rows.Next() {
		var c AuthCode
		var orderID, userID sql.NullInt64
		if err := rows.Scan(&c.ID, &c.Code, &c.CodeTypeID, &orderID, &userID, &c.Status, &c.CreatedAt); err != nil {
			return nil, err
		}
		if orderID.Valid {
			c.OrderID = &orderID.Int64
		}
		if userID.Valid {
			c.UserID = &userID.Int64
		}
		codes = append(codes, c)
	}
	return codes, nil
}
