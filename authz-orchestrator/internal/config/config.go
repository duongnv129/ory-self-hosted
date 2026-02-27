package config

import (
	"strings"

	"github.com/spf13/viper"
)

// Config holds all configuration for the AuthZ Orchestrator service
type Config struct {
	Server struct {
		Port string `mapstructure:"port"`
		Host string `mapstructure:"host"`
	} `mapstructure:"server"`

	Keto struct {
		ReadURL  string `mapstructure:"read_url"`
		WriteURL string `mapstructure:"write_url"`
	} `mapstructure:"keto"`

	OPA struct {
		URL string `mapstructure:"url"`
	} `mapstructure:"opa"`

	Storage struct {
		ConfigPath string `mapstructure:"config_path"`
	} `mapstructure:"storage"`

	Logging struct {
		Level string `mapstructure:"level"`
	} `mapstructure:"logging"`
}

// Load loads configuration from environment variables and config files
func Load() (*Config, error) {
	viper.SetDefault("server.port", "8080")
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("keto.read_url", "http://keto:4466")
	viper.SetDefault("keto.write_url", "http://keto:4467")
	viper.SetDefault("opa.url", "http://opa:8181")
	viper.SetDefault("storage.config_path", "./config")
	viper.SetDefault("logging.level", "info")

	// Environment variable configuration
	viper.SetEnvPrefix("AUTHZ")
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	// Override with environment variables if set
	if port := viper.GetString("PORT"); port != "" {
		viper.Set("server.port", port)
	}
	if ketoReadURL := viper.GetString("KETO_READ_URL"); ketoReadURL != "" {
		viper.Set("keto.read_url", ketoReadURL)
	}
	if ketoWriteURL := viper.GetString("KETO_WRITE_URL"); ketoWriteURL != "" {
		viper.Set("keto.write_url", ketoWriteURL)
	}
	if opaURL := viper.GetString("OPA_URL"); opaURL != "" {
		viper.Set("opa.url", opaURL)
	}
	if configPath := viper.GetString("CONFIG_PATH"); configPath != "" {
		viper.Set("storage.config_path", configPath)
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}