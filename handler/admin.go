package handler

import (
	"fenxiao/db"
	"fenxiao/model"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Code Type CRUD
func AdminListCodeTypes(c *gin.Context) {
	types, err := model.ListCodeTypes(false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if types == nil {
		types = []model.CodeType{}
	}
	c.JSON(http.StatusOK, types)
}

type CodeTypeReq struct {
	Name         string `json:"name" binding:"required"`
	Price        int64  `json:"price" binding:"required"`
	CommissionL1 int64  `json:"commission_l1"`
	CommissionL2 int64  `json:"commission_l2"`
	ImageURL     string `json:"image_url"`
	IsActive     *bool  `json:"is_active"`
}

func AdminCreateCodeType(c *gin.Context) {
	var req CodeTypeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}
	id, err := model.CreateCodeType(req.Name, req.Price, req.CommissionL1, req.CommissionL2, req.ImageURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id})
}

func AdminUpdateCodeType(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req CodeTypeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	if err := model.UpdateCodeType(id, req.Name, req.Price, req.CommissionL1, req.CommissionL2, req.ImageURL, isActive); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "更新成功"})
}

func AdminDeleteCodeType(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := model.DeleteCodeType(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// Auth Codes
type GenerateCodesReq struct {
	CodeTypeID int64 `json:"code_type_id" binding:"required"`
	Count      int   `json:"count" binding:"required,min=1,max=1000"`
}

func AdminGenerateAuthCodes(c *gin.Context) {
	var req GenerateCodesReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}
	generated, err := model.GenerateAuthCodes(req.CodeTypeID, req.Count)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"generated": generated})
}

func AdminListAuthCodes(c *gin.Context) {
	limit := 100
	offset := 0
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 {
		limit = l
	}
	if o, err := strconv.Atoi(c.Query("offset")); err == nil && o >= 0 {
		offset = o
	}
	codes, err := model.GetAllAuthCodes(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if codes == nil {
		codes = []model.AuthCode{}
	}
	c.JSON(http.StatusOK, codes)
}

// Orders
func AdminListOrders(c *gin.Context) {
	orders, err := model.GetAllOrders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if orders == nil {
		orders = []model.Order{}
	}
	c.JSON(http.StatusOK, orders)
}

func AdminPayOrder(c *gin.Context) {
	orderID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := model.PayOrder(orderID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "确认支付成功"})
}

// Users
func AdminListUsers(c *gin.Context) {
	rows, err := db.DB.Query(`
		SELECT id, phone, nickname, avatar_url, referrer_id, is_distributor, created_at
		FROM user ORDER BY id DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type UserInfo struct {
		model.User
		L1Count int `json:"l1_count"`
	}

	var users []UserInfo
	for rows.Next() {
		var u model.User
		var isDistributor int
		var referrerID interface{}
		if err := rows.Scan(&u.ID, &u.Phone, &u.Nickname, &u.AvatarURL, &referrerID, &isDistributor, &u.CreatedAt); err != nil {
			continue
		}
		u.IsDistributor = isDistributor == 1
		// Count L1 subordinates
		var l1Count int
		db.DB.QueryRow(`SELECT COUNT(*) FROM user WHERE referrer_id = ?`, u.ID).Scan(&l1Count)
		users = append(users, UserInfo{User: u, L1Count: l1Count})
	}
	if users == nil {
		c.JSON(http.StatusOK, []UserInfo{})
		return
	}
	c.JSON(http.StatusOK, users)
}

// Commissions
func AdminListCommissions(c *gin.Context) {
	comms, err := model.GetAllCommissions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if comms == nil {
		comms = []model.Commission{}
	}
	c.JSON(http.StatusOK, comms)
}

func AdminSettleCommissions(c *gin.Context) {
	affected, err := model.SettleAllPendingCommissions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"settled": affected})
}
