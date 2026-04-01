package handler

import (
	"fenxiao/model"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetDistributionSummary(c *gin.Context) {
	userID := c.GetInt64("user_id")
	summary, err := model.GetCommissionSummary(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取佣金信息失败"})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func GetMyCommissions(c *gin.Context) {
	userID := c.GetInt64("user_id")
	comms, err := model.GetCommissionsByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取佣金记录失败"})
		return
	}
	if comms == nil {
		comms = []model.Commission{}
	}
	c.JSON(http.StatusOK, comms)
}

func GetMyTeam(c *gin.Context) {
	userID := c.GetInt64("user_id")
	members, err := model.GetTeam(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取团队信息失败"})
		return
	}
	if members == nil {
		members = []model.TeamMember{}
	}
	c.JSON(http.StatusOK, members)
}

func GetReferralLink(c *gin.Context) {
	userID := c.GetInt64("user_id")
	user, err := model.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}
	if !user.IsDistributor {
		c.JSON(http.StatusForbidden, gin.H{"error": "需要先购买产品成为分销商"})
		return
	}
	link := fmt.Sprintf("/register?ref=%d", userID)
	c.JSON(http.StatusOK, gin.H{"link": link})
}
