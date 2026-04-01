package handler

import (
	"fenxiao/model"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func ListProducts(c *gin.Context) {
	types, err := model.ListCodeTypes(true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取产品列表失败"})
		return
	}
	if types == nil {
		types = []model.CodeType{}
	}
	c.JSON(http.StatusOK, types)
}

func GetProduct(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	t, err := model.GetCodeType(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "产品不存在"})
		return
	}
	c.JSON(http.StatusOK, t)
}
