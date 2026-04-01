package main

import (
	"fenxiao/db"
	"fenxiao/handler"
	"fenxiao/middleware"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	db.Init()

	r := gin.Default()

	// CORS for development
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Public APIs
	api := r.Group("/api")
	{
		api.POST("/auth/register", handler.Register)
		api.POST("/auth/login", handler.Login)
		api.POST("/admin/login", handler.AdminLogin)
		api.GET("/products", handler.ListProducts)
		api.GET("/products/:id", handler.GetProduct)
	}

	// User APIs (authenticated)
	user := api.Group("")
	user.Use(middleware.AuthRequired())
	{
		user.GET("/user/me", handler.GetMe)
		user.POST("/orders", handler.CreateOrderHandler)
		user.POST("/orders/:id/pay", handler.PayOrderHandler)
		user.GET("/orders", handler.ListMyOrders)
		user.GET("/orders/:id", handler.GetOrderDetail)
		user.GET("/distribution/summary", handler.GetDistributionSummary)
		user.GET("/distribution/commissions", handler.GetMyCommissions)
		user.GET("/distribution/team", handler.GetMyTeam)
		user.GET("/distribution/referral-link", handler.GetReferralLink)
	}

	// Admin APIs
	admin := api.Group("/admin")
	admin.Use(middleware.AuthRequired(), middleware.AdminRequired())
	{
		admin.GET("/code-types", handler.AdminListCodeTypes)
		admin.POST("/code-types", handler.AdminCreateCodeType)
		admin.PUT("/code-types/:id", handler.AdminUpdateCodeType)
		admin.DELETE("/code-types/:id", handler.AdminDeleteCodeType)
		admin.POST("/auth-codes/generate", handler.AdminGenerateAuthCodes)
		admin.GET("/auth-codes", handler.AdminListAuthCodes)
		admin.GET("/orders", handler.AdminListOrders)
		admin.POST("/orders/:id/pay", handler.AdminPayOrder)
		admin.GET("/users", handler.AdminListUsers)
		admin.GET("/commissions", handler.AdminListCommissions)
		admin.POST("/commissions/settle", handler.AdminSettleCommissions)
	}

	// Serve frontend static files
	if _, err := os.Stat("frontend/dist"); err == nil {
		frontendFS := os.DirFS("frontend/dist")
		r.NoRoute(func(c *gin.Context) {
			// Try to serve static file
			path := c.Request.URL.Path
			if path == "/" {
				path = "/index.html"
			}
			f, err := fs.Stat(frontendFS, path[1:])
			if err == nil && !f.IsDir() {
				c.FileFromFS(path[1:], http.FS(frontendFS))
				return
			}
			// SPA fallback
			c.FileFromFS("index.html", http.FS(frontendFS))
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on :%s", port)
	r.Run(":" + port)
}
