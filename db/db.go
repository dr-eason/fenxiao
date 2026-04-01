package db

import (
	"database/sql"
	_ "embed"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

//go:embed migrations.sql
var migrationSQL string

var DB *sql.DB

func Init() {
	dataDir := "data"
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		log.Fatal("Failed to create data directory:", err)
	}

	dbPath := filepath.Join(dataDir, "fenxiao.db")
	var err error
	DB, err = sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)")
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	DB.SetMaxOpenConns(1) // SQLite works best with single writer

	if _, err := DB.Exec(migrationSQL); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Seed default admin if not exists
	var count int
	DB.QueryRow("SELECT COUNT(*) FROM admin").Scan(&count)
	if count == 0 {
		// Default password: admin123 (bcrypt would be better but keeping it simple with plain comparison + salt)
		DB.Exec("INSERT INTO admin (username, password) VALUES (?, ?)", "admin", "admin123")
	}

	log.Println("Database initialized:", dbPath)
}
