package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/ory-self-hosted/authz-orchestrator/internal/api/routes"
	"github.com/ory-self-hosted/authz-orchestrator/internal/clients/keto"
	"github.com/ory-self-hosted/authz-orchestrator/internal/clients/opa"
	"github.com/ory-self-hosted/authz-orchestrator/internal/config"
	"github.com/ory-self-hosted/authz-orchestrator/internal/services/decision"
	"github.com/ory-self-hosted/authz-orchestrator/internal/services/policy"
	"github.com/ory-self-hosted/authz-orchestrator/internal/storage"
)

func main() {
	// Initialize logger
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	log.Info().Msg("Starting AuthZ Orchestrator")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load configuration")
	}

	log.Info().
		Str("port", cfg.Server.Port).
		Str("keto_read_url", cfg.Keto.ReadURL).
		Str("opa_url", cfg.OPA.URL).
		Msg("Configuration loaded")

	// Initialize clients
	ketoClient := keto.NewClient(cfg.Keto.ReadURL, cfg.Keto.WriteURL)
	opaClient := opa.NewClient(cfg.OPA.URL)

	// Initialize storage
	storageService, err := storage.NewFileStorage(cfg.Storage.ConfigPath)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize storage")
	}

	// Initialize services
	policyService := policy.NewManager(storageService)
	decisionService := decision.NewOrchestrator(ketoClient, opaClient, policyService)

	// Initialize HTTP router
	router := routes.NewRouter(decisionService, policyService, ketoClient, opaClient)

	// Setup HTTP server
	srv := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		log.Info().Str("port", cfg.Server.Port).Msg("Starting HTTP server")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Failed to start server")
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Server exited")
}