package handler

import (
	"fenxiao/model"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type CreateOrderReq struct {
	CodeTypeID int64 `json:"code_type_id" binding:"required"`
	Quantity   int   `json:"quantity" binding:"required,min=1"`
}

func CreateOrderHandler(c *gin.Context) {
	var req CreateOrderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	userID := c.GetInt64("user_id")
	order, err := model.CreateOrder(userID, req.CodeTypeID, req.Quantity)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, order)
}

func PayOrderHandler(c *gin.Context) {
	orderID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := model.PayOrder(orderID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "支付成功"})
}

func ListMyOrders(c *gin.Context) {
	userID := c.GetInt64("user_id")
	orders, err := model.GetOrdersByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取订单失败"})
		return
	}
	if orders == nil {
		orders = []model.Order{}
	}
	c.JSON(http.StatusOK, orders)
}

func GetOrderDetail(c *gin.Context) {
	orderID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	userID := c.GetInt64("user_id")

	orders, err := model.GetOrdersByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取订单失败"})
		return
	}

	for _, o := range orders {
		if o.ID == orderID {
			codes, _ := model.GetAuthCodesByOrder(orderID)
			if codes == nil {
				codes = []model.AuthCode{}
			}
			c.JSON(http.StatusOK, gin.H{"order": o, "codes": codes})
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "订单不存在"})
}
