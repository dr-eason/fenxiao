package model

import (
	"fenxiao/db"
	"time"
)

type CodeType struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name"`
	Price        int64     `json:"price"`
	ImageURL     string    `json:"image_url"`
	CommissionL1 int64     `json:"commission_l1"`
	CommissionL2 int64     `json:"commission_l2"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

func ListCodeTypes(activeOnly bool) ([]CodeType, error) {
	query := `SELECT id, name, price, image_url, commission_l1, commission_l2, is_active, created_at FROM code_type`
	if activeOnly {
		query += ` WHERE is_active = 1`
	}
	query += ` ORDER BY id DESC`

	rows, err := db.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var types []CodeType
	for rows.Next() {
		var t CodeType
		var isActive int
		if err := rows.Scan(&t.ID, &t.Name, &t.Price, &t.ImageURL, &t.CommissionL1, &t.CommissionL2, &isActive, &t.CreatedAt); err != nil {
			return nil, err
		}
		t.IsActive = isActive == 1
		types = append(types, t)
	}
	return types, nil
}

func GetCodeType(id int64) (*CodeType, error) {
	t := &CodeType{}
	var isActive int
	err := db.DB.QueryRow(
		`SELECT id, name, price, image_url, commission_l1, commission_l2, is_active, created_at FROM code_type WHERE id = ?`, id,
	).Scan(&t.ID, &t.Name, &t.Price, &t.ImageURL, &t.CommissionL1, &t.CommissionL2, &isActive, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	t.IsActive = isActive == 1
	return t, nil
}

func CreateCodeType(name string, price, commL1, commL2 int64, imageURL string) (int64, error) {
	result, err := db.DB.Exec(
		`INSERT INTO code_type (name, price, commission_l1, commission_l2, image_url) VALUES (?, ?, ?, ?, ?)`,
		name, price, commL1, commL2, imageURL,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func UpdateCodeType(id int64, name string, price, commL1, commL2 int64, imageURL string, isActive bool) error {
	active := 0
	if isActive {
		active = 1
	}
	_, err := db.DB.Exec(
		`UPDATE code_type SET name=?, price=?, commission_l1=?, commission_l2=?, image_url=?, is_active=? WHERE id=?`,
		name, price, commL1, commL2, imageURL, active, id,
	)
	return err
}

func DeleteCodeType(id int64) error {
	_, err := db.DB.Exec(`DELETE FROM code_type WHERE id = ?`, id)
	return err
}
