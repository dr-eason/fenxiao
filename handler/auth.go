package handler

import (
	"database/sql"
	"fenxiao/db"
	"fenxiao/middleware"
	"fenxiao/model"
	"net/http"

	"github.com/gin-gonic/gin"
)

type RegisterReq struct {
	Phone      string `json:"phone" binding:"required"`
	Password   string `json:"password" binding:"required"`
	Nickname   string `json:"nickname"`
	ReferrerID *int64 `json:"referrer_id"`
}

func Register(c *gin.Context) {
	var req RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	// Check if user exists
	if _, err := model.GetUserByPhone(req.Phone); err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "手机号已注册"})
		return
	}

	// Validate referrer
	var refID *int64
	if req.ReferrerID != nil {
		ref, err := model.GetUserByID(*req.ReferrerID)
		if err == nil && ref.IsDistributor {
			refID = req.ReferrerID
		}
	}

	nickname := req.Nickname
	if nickname == "" {
		nickname = "用户" + req.Phone[len(req.Phone)-4:]
	}

	userID, err := model.CreateUser(req.Phone, nickname, req.Password, refID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "注册失败"})
		return
	}

	token, _ := middleware.GenerateToken(userID, "user")
	c.JSON(http.StatusOK, gin.H{"token": token, "user_id": userID})
}

type LoginReq struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var req LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	user, err := model.CheckUserPassword(req.Phone, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "手机号或密码错误"})
		return
	}

	token, _ := middleware.GenerateToken(user.ID, "user")
	c.JSON(http.StatusOK, gin.H{"token": token, "user": user})
}

type AdminLoginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func AdminLogin(c *gin.Context) {
	var req AdminLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	var id int64
	var storedPwd string
	err := db.DB.QueryRow(`SELECT id, password FROM admin WHERE username = ?`, req.Username).Scan(&id, &storedPwd)
	if err == sql.ErrNoRows || storedPwd != req.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	token, _ := middleware.GenerateToken(id, "admin")
	c.JSON(http.StatusOK, gin.H{"token": token})
}

func GetMe(c *gin.Context) {
	userID := c.GetInt64("user_id")
	user, err := model.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}
	c.JSON(http.StatusOK, user)
}
