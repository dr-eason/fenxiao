package model

import (
	"database/sql"
	"fenxiao/db"
	"time"
)

type Commission struct {
	ID         int64     `json:"id"`
	UserID     int64     `json:"user_id"`
	OrderID    int64     `json:"order_id"`
	FromUserID int64     `json:"from_user_id"`
	Level      int       `json:"level"`
	Amount     int64     `json:"amount"`
	Status     int       `json:"status"` // 0=pending, 1=settled
	CreatedAt  time.Time `json:"created_at"`
	// Joined
	FromUserNickname string `json:"from_user_nickname,omitempty"`
	FromUserPhone    string `json:"from_user_phone,omitempty"`
}

type CommissionSummary struct {
	Total   int64 `json:"total"`
	Pending int64 `json:"pending"`
	Settled int64 `json:"settled"`
}

func GetCommissionSummary(userID int64) (*CommissionSummary, error) {
	s := &CommissionSummary{}
	err := db.DB.QueryRow(`
		SELECT
			COALESCE(SUM(amount), 0),
			COALESCE(SUM(CASE WHEN status=0 THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN status=1 THEN amount ELSE 0 END), 0)
		FROM commission WHERE user_id = ?`, userID,
	).Scan(&s.Total, &s.Pending, &s.Settled)
	return s, err
}

func GetCommissionsByUser(userID int64) ([]Commission, error) {
	rows, err := db.DB.Query(`
		SELECT c.id, c.user_id, c.order_id, c.from_user_id, c.level, c.amount, c.status, c.created_at,
			u.nickname, u.phone
		FROM commission c LEFT JOIN user u ON c.from_user_id = u.id
		WHERE c.user_id = ? ORDER BY c.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanCommissions(rows)
}

func GetAllCommissions() ([]Commission, error) {
	rows, err := db.DB.Query(`
		SELECT c.id, c.user_id, c.order_id, c.from_user_id, c.level, c.amount, c.status, c.created_at,
			u.nickname, u.phone
		FROM commission c LEFT JOIN user u ON c.from_user_id = u.id
		ORDER BY c.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanCommissions(rows)
}

func SettleCommissions(ids []int64) error {
	for _, id := range ids {
		db.DB.Exec(`UPDATE commission SET status = 1 WHERE id = ? AND status = 0`, id)
	}
	return nil
}

func SettleAllPendingCommissions() (int64, error) {
	result, err := db.DB.Exec(`UPDATE commission SET status = 1 WHERE status = 0`)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func scanCommissions(rows *sql.Rows) ([]Commission, error) {
	var comms []Commission
	for rows.Next() {
		var c Commission
		var nickname, phone sql.NullString
		if err := rows.Scan(&c.ID, &c.UserID, &c.OrderID, &c.FromUserID, &c.Level, &c.Amount, &c.Status, &c.CreatedAt, &nickname, &phone); err != nil {
			return nil, err
		}
		if nickname.Valid {
			c.FromUserNickname = nickname.String
		}
		if phone.Valid {
			c.FromUserPhone = phone.String
		}
		comms = append(comms, c)
	}
	return comms, nil
}
