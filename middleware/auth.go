package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var JWTSecret = []byte("fenxiao-secret-key-change-in-production")

type Claims struct {
	UserID int64  `json:"user_id"`
	Role   string `json:"role"` // "user" or "admin"
	jwt.RegisteredClaims
}

func GenerateToken(userID int64, role string) (string, error) {
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecret)
}

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := extractToken(c)
		if tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
			c.Abort()
			return
		}
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return JWTSecret, nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "登录已过期"})
			c.Abort()
			return
		}
		c.Set("user_id", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "无权限"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func extractToken(c *gin.Context) string {
	auth := c.GetHeader("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return auth[7:]
	}
	return c.Query("token")
}
