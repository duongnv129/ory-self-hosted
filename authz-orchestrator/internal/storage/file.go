package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/rs/zerolog/log"

	"github.com/ory-self-hosted/authz-orchestrator/internal/models"
)

// FileStorage implements tenant configuration storage using files
type FileStorage struct {
	configPath string
	mu         sync.RWMutex
	configs    map[string]*models.TenantConfig
}

// NewFileStorage creates a new file-based storage instance
func NewFileStorage(configPath string) (*FileStorage, error) {
	storage := &FileStorage{
		configPath: configPath,
		configs:    make(map[string]*models.TenantConfig),
	}

	// Create config directory if it doesn't exist
	if err := os.MkdirAll(configPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create config directory: %w", err)
	}

	// Load existing configurations
	if err := storage.loadConfigs(); err != nil {
		log.Warn().Err(err).Msg("Failed to load existing configurations")
	}

	return storage, nil
}

// GetTenantConfig retrieves the configuration for a tenant
func (fs *FileStorage) GetTenantConfig(tenantID string) (*models.TenantConfig, error) {
	fs.mu.RLock()
	defer fs.mu.RUnlock()

	config, exists := fs.configs[tenantID]
	if !exists {
		return nil, fmt.Errorf("tenant config not found: %s", tenantID)
	}

	return config, nil
}

// SaveTenantConfig saves the configuration for a tenant
func (fs *FileStorage) SaveTenantConfig(config *models.TenantConfig) error {
	fs.mu.Lock()
	defer fs.mu.Unlock()

	// Update in-memory cache
	fs.configs[config.TenantID] = config

	// Save to file
	filename := filepath.Join(fs.configPath, fmt.Sprintf("%s.json", config.TenantID))
	return fs.saveConfigFile(filename, config)
}

// ListTenants returns a list of all tenant IDs
func (fs *FileStorage) ListTenants() ([]string, error) {
	fs.mu.RLock()
	defer fs.mu.RUnlock()

	tenants := make([]string, 0, len(fs.configs))
	for tenantID := range fs.configs {
		tenants = append(tenants, tenantID)
	}

	return tenants, nil
}

// DeleteTenantConfig removes the configuration for a tenant
func (fs *FileStorage) DeleteTenantConfig(tenantID string) error {
	fs.mu.Lock()
	defer fs.mu.Unlock()

	// Remove from in-memory cache
	delete(fs.configs, tenantID)

	// Remove file
	filename := filepath.Join(fs.configPath, fmt.Sprintf("%s.json", tenantID))
	if err := os.Remove(filename); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete config file: %w", err)
	}

	return nil
}

// loadConfigs loads all tenant configurations from files
func (fs *FileStorage) loadConfigs() error {
	entries, err := os.ReadDir(fs.configPath)
	if err != nil {
		return fmt.Errorf("failed to read config directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		filename := filepath.Join(fs.configPath, entry.Name())
		config, err := fs.loadConfigFile(filename)
		if err != nil {
			log.Warn().Err(err).Str("file", filename).Msg("Failed to load config file")
			continue
		}

		fs.configs[config.TenantID] = config
		log.Debug().Str("tenant", config.TenantID).Msg("Loaded tenant configuration")
	}

	log.Info().Int("count", len(fs.configs)).Msg("Loaded tenant configurations")
	return nil
}

// loadConfigFile loads a single configuration file
func (fs *FileStorage) loadConfigFile(filename string) (*models.TenantConfig, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	var config models.TenantConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &config, nil
}

// saveConfigFile saves a configuration to a file
func (fs *FileStorage) saveConfigFile(filename string, config *models.TenantConfig) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	log.Debug().Str("tenant", config.TenantID).Str("file", filename).Msg("Saved tenant configuration")
	return nil
}