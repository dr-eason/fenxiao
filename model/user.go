package model

import (
	"database/sql"
	"fenxiao/db"
	"time"
)

type User struct {
	ID            int64      `json:"id"`
	Phone         string     `json:"phone"`
	Nickname      string     `json:"nickname"`
	AvatarURL     string     `json:"avatar_url"`
	ReferrerID    *int64     `json:"referrer_id"`
	IsDistributor bool       `json:"is_distributor"`
	CreatedAt     time.Time  `json:"created_at"`
}

func GetUserByID(id int64) (*User, error) {
	u := &User{}
	var isDistributor int
	var referrerID sql.NullInt64
	err := db.DB.QueryRow(
		`SELECT id, phone, nickname, avatar_url, referrer_id, is_distributor, created_at FROM user WHERE id = ?`, id,
	).Scan(&u.ID, &u.Phone, &u.Nickname, &u.AvatarURL, &referrerID, &isDistributor, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.IsDistributor = isDistributor == 1
	if referrerID.Valid {
		u.ReferrerID = &referrerID.Int64
	}
	return u, nil
}

func GetUserByPhone(phone string) (*User, error) {
	u := &User{}
	var isDistributor int
	var referrerID sql.NullInt64
	err := db.DB.QueryRow(
		`SELECT id, phone, nickname, avatar_url, referrer_id, is_distributor, created_at FROM user WHERE phone = ?`, phone,
	).Scan(&u.ID, &u.Phone, &u.Nickname, &u.AvatarURL, &referrerID, &isDistributor, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.IsDistributor = isDistributor == 1
	if referrerID.Valid {
		u.ReferrerID = &referrerID.Int64
	}
	return u, nil
}

func CreateUser(phone, nickname, password string, referrerID *int64) (int64, error) {
	var refID interface{} = nil
	if referrerID != nil {
		refID = *referrerID
	}
	result, err := db.DB.Exec(
		`INSERT INTO user (phone, nickname, password, referrer_id) VALUES (?, ?, ?, ?)`,
		phone, nickname, password, refID,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func CheckUserPassword(phone, password string) (*User, error) {
	u := &User{}
	var storedPassword string
	var isDistributor int
	var referrerID sql.NullInt64
	err := db.DB.QueryRow(
		`SELECT id, phone, nickname, avatar_url, referrer_id, is_distributor, created_at, password FROM user WHERE phone = ?`, phone,
	).Scan(&u.ID, &u.Phone, &u.Nickname, &u.AvatarURL, &referrerID, &isDistributor, &u.CreatedAt, &storedPassword)
	if err != nil {
		return nil, err
	}
	if storedPassword != password {
		return nil, sql.ErrNoRows
	}
	u.IsDistributor = isDistributor == 1
	if referrerID.Valid {
		u.ReferrerID = &referrerID.Int64
	}
	return u, nil
}

type TeamMember struct {
	ID            int64     `json:"id"`
	Nickname      string    `json:"nickname"`
	Phone         string    `json:"phone"`
	AvatarURL     string    `json:"avatar_url"`
	IsDistributor bool      `json:"is_distributor"`
	L2Count       int       `json:"l2_count"`
	CreatedAt     time.Time `json:"created_at"`
}

func GetTeam(userID int64) ([]TeamMember, error) {
	rows, err := db.DB.Query(`
		SELECT u.id, u.nickname, u.phone, u.avatar_url, u.is_distributor, u.created_at,
			(SELECT COUNT(*) FROM user WHERE referrer_id = u.id) as l2_count
		FROM user u WHERE u.referrer_id = ? ORDER BY u.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []TeamMember
	for rows.Next() {
		var m TeamMember
		var isDistributor int
		if err := rows.Scan(&m.ID, &m.Nickname, &m.Phone, &m.AvatarURL, &isDistributor, &m.CreatedAt, &m.L2Count); err != nil {
			return nil, err
		}
		m.IsDistributor = isDistributor == 1
		members = append(members, m)
	}
	return members, nil
}
