# Agent Skills Implementation Design for ADK-Go

## Table of Contents

- [Overview](#overview)
- [Current Architecture Analysis](#current-architecture-analysis)
- [Design Goals](#design-goals)
- [Architecture Design](#architecture-design)
- [API Specification](#api-specification)
- [Progressive Disclosure Implementation](#progressive-disclosure-implementation)
- [Security Considerations](#security-considerations)
- [Implementation Phases](#implementation-phases)
- [Testing Strategy](#testing-strategy)
- [Migration and Compatibility](#migration-and-compatibility)
- [Future Considerations](#future-considerations)
- [Appendix](#appendix)

## Overview

This document outlines the design for implementing Agent Skills support in ADK-Go, enabling compatibility with the open Agent Skills standard (SKILL.md format). Agent Skills provide a structured way to extend AI agent capabilities through reusable, portable skill packages that include instructions, scripts, and resources.

### Agent Skills Standard Summary

Agent Skills are organized folders containing:
- **SKILL.md**: YAML frontmatter + Markdown instructions
- **scripts/**: Executable code (Python, Bash, JavaScript)
- **references/**: Additional documentation loaded on-demand
- **assets/**: Static resources (templates, data files, etc.)

The standard implements **progressive disclosure** with 3 stages:
1. **Discovery** (~100 tokens): Only name and description loaded at startup
2. **Activation** (~2-5K tokens): Full instructions loaded when skill is triggered
3. **Execution** (on-demand): Scripts and references loaded as needed

## Current Architecture Analysis

### ADK-Go Core Components

ADK-Go provides a solid foundation for skills integration:

```go
// Core abstractions that skills will build upon
type Agent interface {
    Name() string
    Description() string
    Run(InvocationContext) iter.Seq2[*session.Event, error]
    SubAgents() []Agent
}

type Tool interface {
    Name() string
    Description() string
    IsLongRunning() bool
}

type Toolset interface {
    Name() string
    Tools(ctx agent.ReadonlyContext) ([]Tool, error)
}
```

### Key Strengths for Skills Integration

1. **Dynamic Tool Loading**: Toolsets can return different tools based on context
2. **Rich Tool Context**: Tools receive context with state, memory, and confirmation access
3. **Plugin Architecture**: Extensible callback system for lifecycle hooks
4. **Session Management**: Built-in state management and conversation flow
5. **Security Model**: Tool confirmation system for sensitive operations

### Integration Strategy

Skills will be implemented as **specialized toolsets** that follow the SKILL.md format, leveraging ADK-Go's existing tool discovery and execution patterns.

## Design Goals

### Primary Goals

1. **Agent Skills Standard Compliance**: Full compatibility with SKILL.md format
2. **Progressive Disclosure**: Three-stage loading to optimize context usage
3. **Go-Native Design**: Idiomatic Go patterns and interfaces
4. **Security**: Safe script execution with appropriate sandboxing
5. **Performance**: Efficient loading and execution of skill components
6. **Extensibility**: Easy to add new script interpreters and resource types

### Secondary Goals

1. **Backward Compatibility**: Existing ADK-Go agents continue to work unchanged
2. **Developer Experience**: Simple API for skill discovery and integration
3. **Observability**: Rich logging and metrics for skill usage
4. **Testing**: Comprehensive test coverage for skill functionality

## Architecture Design

### Component Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADK-Go Skills Architecture                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Skill Sources                                 │    │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │    │
│  │  │   Local SKILL   │    │   Remote Skills │    │   Built-in      │  │    │
│  │  │   Directories   │    │   (Future)      │    │   Skills        │  │    │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘  │    │
│  └─────────────────────────┼──────────────────────┼─────────────────────┘    │
│                            │                      │                          │
│                            ▼                      ▼                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    SkillLoader                                       │    │
│  │  • Discovers skills from directories                                │    │
│  │  • Parses SKILL.md frontmatter                                     │    │
│  │  • Validates skill structure                                        │    │
│  │  • Creates skill instances                                          │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Skill                                         │    │
│  │  • Implements tool.Toolset interface                                │    │
│  │  • Progressive disclosure stages                                     │    │
│  │  • Resource management                                               │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   │                                          │
│              ┌────────────────────┼────────────────────┐                    │
│              ▼                    ▼                    ▼                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐     │
│  │ SkillActivation │  │  ScriptExecutor │  │   ReferenceLoader       │     │
│  │     Tool        │  │                 │  │                         │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Package Structure

```
skill/
├── skill.go              # Core interfaces and types
├── loader.go             # Skill discovery and loading
├── metadata.go           # SKILL.md parsing
├── executor.go           # Script execution
├── toolset.go            # Toolset implementation
└── internal/
    ├── parser/           # YAML frontmatter parser
    ├── sandbox/          # Script sandboxing
    └── validation/       # Skill validation
```

## API Specification

### Core Interfaces

```go
package skill

import (
    "context"
    "path/filepath"

    "google.golang.org/adk/agent"
    "google.golang.org/adk/tool"
)

// Skill represents a loaded Agent Skills standard skill
type Skill interface {
    tool.Toolset

    // Metadata access
    Metadata() *Metadata
    Instructions() (string, error)

    // Resource access
    ListScripts() []string
    ListReferences() []string
    ListAssets() []string

    LoadScript(name string) ([]byte, error)
    LoadReference(name string) ([]byte, error)
    GetAssetPath(name string) (string, error)

    // Progressive disclosure state
    Stage() DisclosureStage
    Activate() error
}

// DisclosureStage represents the current loading stage
type DisclosureStage int

const (
    StageDiscovery   DisclosureStage = 1 // Metadata only
    StageActivation  DisclosureStage = 2 // Instructions loaded
    StageExecution   DisclosureStage = 3 // Resources accessible
)

// Metadata represents parsed SKILL.md frontmatter
type Metadata struct {
    Name           string            `yaml:"name"`
    Description    string            `yaml:"description"`
    License        string            `yaml:"license,omitempty"`
    Compatibility  string            `yaml:"compatibility,omitempty"`
    Metadata       map[string]any    `yaml:"metadata,omitempty"`
    AllowedTools   string            `yaml:"allowed-tools,omitempty"`

    // ADK-Go extensions
    ADK *ADKConfig `yaml:"adk,omitempty"`
}

// ADKConfig contains ADK-Go specific configurations
type ADKConfig struct {
    Security *SecurityConfig `yaml:"security,omitempty"`
    Scripts  *ScriptConfig   `yaml:"scripts,omitempty"`
}

type SecurityConfig struct {
    AllowNetwork    bool     `yaml:"allow_network,omitempty"`
    AllowFileSystem bool     `yaml:"allow_filesystem,omitempty"`
    TimeoutSeconds  int      `yaml:"timeout_seconds,omitempty"`
    MemoryLimitMB   int      `yaml:"memory_limit_mb,omitempty"`
    AllowedCommands []string `yaml:"allowed_commands,omitempty"`
}

type ScriptConfig struct {
    Interpreters map[string]string `yaml:"interpreters,omitempty"`
    Environment  map[string]string `yaml:"environment,omitempty"`
}

// Loader discovers and loads skills from directories
type Loader struct {
    directories []string
    skills      map[string]Skill
    errors      map[string]error
}

// NewLoader creates a new skill loader
func NewLoader() *Loader {
    return &Loader{
        skills: make(map[string]Skill),
        errors: make(map[string]error),
    }
}

// AddDirectory adds a directory to scan for skills
func (l *Loader) AddDirectory(path string) error {
    absPath, err := filepath.Abs(path)
    if err != nil {
        return fmt.Errorf("invalid path %s: %w", path, err)
    }

    l.directories = append(l.directories, absPath)
    return l.discoverInDirectory(absPath)
}

// Skills returns all discovered skills
func (l *Loader) Skills() []Skill {
    skills := make([]Skill, 0, len(l.skills))
    for _, skill := range l.skills {
        skills = append(skills, skill)
    }
    return skills
}

// AsToolsets converts skills to toolsets for agent integration
func (l *Loader) AsToolsets() []tool.Toolset {
    toolsets := make([]tool.Toolset, 0, len(l.skills))
    for _, skill := range l.skills {
        toolsets = append(toolsets, skill)
    }
    return toolsets
}

// GenerateDiscoveryPrompt creates XML prompt for LLM skill discovery
func (l *Loader) GenerateDiscoveryPrompt() string {
    if len(l.skills) == 0 {
        return "<available_skills></available_skills>"
    }

    var builder strings.Builder
    builder.WriteString("<available_skills>\n")

    for _, skill := range l.skills {
        metadata := skill.Metadata()
        builder.WriteString(fmt.Sprintf(`  <skill>
    <name>%s</name>
    <description>%s</description>
    <has_scripts>%t</has_scripts>
    <has_references>%t</has_references>
  </skill>
`, metadata.Name, metadata.Description,
           len(skill.ListScripts()) > 0,
           len(skill.ListReferences()) > 0))
    }

    builder.WriteString("</available_skills>")
    return builder.String()
}
```

### Skill Implementation

```go
// skillFromDirectory implements the Skill interface for directory-based skills
type skillFromDirectory struct {
    name        string
    description string
    path        string
    metadata    *Metadata

    // Progressive disclosure state
    stage        DisclosureStage
    instructions string

    // Cached resources
    scripts    map[string][]byte
    references map[string][]byte

    // Tools generated from skill contents
    tools []tool.Tool

    // Script executor
    executor *ScriptExecutor
}

// NewSkillFromDirectory creates a skill from a directory containing SKILL.md
func NewSkillFromDirectory(path string) (Skill, error) {
    skillMDPath := filepath.Join(path, "SKILL.md")
    if _, err := os.Stat(skillMDPath); os.IsNotExist(err) {
        return nil, fmt.Errorf("SKILL.md not found in %s", path)
    }

    metadata, instructions, err := parseSkillMD(skillMDPath)
    if err != nil {
        return nil, fmt.Errorf("failed to parse %s: %w", skillMDPath, err)
    }

    // Validate directory name matches skill name
    if filepath.Base(path) != metadata.Name {
        return nil, fmt.Errorf("directory name %s must match skill name %s",
                             filepath.Base(path), metadata.Name)
    }

    skill := &skillFromDirectory{
        name:         metadata.Name,
        description:  metadata.Description,
        path:         path,
        metadata:     metadata,
        stage:        StageDiscovery,
        instructions: instructions,
        scripts:      make(map[string][]byte),
        references:   make(map[string][]byte),
        executor:     NewScriptExecutor(metadata.ADK),
    }

    return skill, nil
}

// Toolset interface implementation
func (s *skillFromDirectory) Name() string {
    return s.name
}

func (s *skillFromDirectory) Tools(ctx agent.ReadonlyContext) ([]tool.Tool, error) {
    switch s.stage {
    case StageDiscovery:
        // Return only activation tool
        return []tool.Tool{
            &SkillActivationTool{skill: s},
        }, nil

    case StageActivation:
        // Return activation + script/reference tools
        tools := []tool.Tool{
            &SkillActivationTool{skill: s},
        }

        // Add script execution tools
        for _, scriptName := range s.ListScripts() {
            tools = append(tools, &SkillScriptTool{
                skill:      s,
                scriptName: scriptName,
            })
        }

        // Add reference loading tools
        for _, refName := range s.ListReferences() {
            tools = append(tools, &SkillReferenceTool{
                skill:         s,
                referenceName: refName,
            })
        }

        return tools, nil

    case StageExecution:
        // All tools available
        return s.tools, nil

    default:
        return nil, fmt.Errorf("invalid disclosure stage: %d", s.stage)
    }
}

// Skill interface implementation
func (s *skillFromDirectory) Metadata() *Metadata {
    return s.metadata
}

func (s *skillFromDirectory) Instructions() (string, error) {
    if s.stage < StageActivation {
        return "", fmt.Errorf("skill not activated")
    }
    return s.instructions, nil
}

func (s *skillFromDirectory) Stage() DisclosureStage {
    return s.stage
}

func (s *skillFromDirectory) Activate() error {
    if s.stage >= StageActivation {
        return nil // Already activated
    }

    // Load full tools list
    tools := []tool.Tool{
        &SkillActivationTool{skill: s},
    }

    // Generate script tools
    for _, scriptName := range s.ListScripts() {
        tools = append(tools, &SkillScriptTool{
            skill:      s,
            scriptName: scriptName,
        })
    }

    // Generate reference tools
    for _, refName := range s.ListReferences() {
        tools = append(tools, &SkillReferenceTool{
            skill:         s,
            referenceName: refName,
        })
    }

    s.tools = tools
    s.stage = StageActivation
    return nil
}

func (s *skillFromDirectory) ListScripts() []string {
    scriptsDir := filepath.Join(s.path, "scripts")
    return s.listFilesInDir(scriptsDir)
}

func (s *skillFromDirectory) ListReferences() []string {
    referencesDir := filepath.Join(s.path, "references")
    return s.listFilesInDir(referencesDir)
}

func (s *skillFromDirectory) ListAssets() []string {
    assetsDir := filepath.Join(s.path, "assets")
    return s.listFilesInDir(assetsDir)
}

func (s *skillFromDirectory) LoadScript(name string) ([]byte, error) {
    if cached, ok := s.scripts[name]; ok {
        return cached, nil
    }

    scriptPath := filepath.Join(s.path, "scripts", name)
    content, err := os.ReadFile(scriptPath)
    if err != nil {
        return nil, fmt.Errorf("failed to load script %s: %w", name, err)
    }

    s.scripts[name] = content
    s.stage = StageExecution
    return content, nil
}

func (s *skillFromDirectory) LoadReference(name string) ([]byte, error) {
    if cached, ok := s.references[name]; ok {
        return cached, nil
    }

    refPath := filepath.Join(s.path, "references", name)
    content, err := os.ReadFile(refPath)
    if err != nil {
        return nil, fmt.Errorf("failed to load reference %s: %w", name, err)
    }

    s.references[name] = content
    s.stage = StageExecution
    return content, nil
}

func (s *skillFromDirectory) GetAssetPath(name string) (string, error) {
    assetPath := filepath.Join(s.path, "assets", name)
    if _, err := os.Stat(assetPath); os.IsNotExist(err) {
        return "", fmt.Errorf("asset %s not found", name)
    }

    s.stage = StageExecution
    return assetPath, nil
}

func (s *skillFromDirectory) listFilesInDir(dir string) []string {
    var files []string
    entries, err := os.ReadDir(dir)
    if err != nil {
        return files // Return empty slice if directory doesn't exist
    }

    for _, entry := range entries {
        if !entry.IsDir() {
            files = append(files, entry.Name())
        }
    }

    return files
}
```

### Tool Implementations

```go
// SkillActivationTool handles skill activation and instruction loading
type SkillActivationTool struct {
    skill Skill
}

func (t *SkillActivationTool) Name() string {
    return fmt.Sprintf("activate_%s", t.skill.Metadata().Name)
}

func (t *SkillActivationTool) Description() string {
    return fmt.Sprintf("Activate the %s skill and load instructions",
                      t.skill.Metadata().Name)
}

func (t *SkillActivationTool) IsLongRunning() bool {
    return false
}

// CallableTool interface (internal ADK-Go interface)
func (t *SkillActivationTool) Call(ctx context.Context, toolCtx tool.Context,
                                  args map[string]any) (any, error) {

    err := t.skill.Activate()
    if err != nil {
        return nil, fmt.Errorf("failed to activate skill: %w", err)
    }

    instructions, err := t.skill.Instructions()
    if err != nil {
        return nil, fmt.Errorf("failed to get instructions: %w", err)
    }

    response := map[string]any{
        "status":               "activated",
        "skill":                t.skill.Metadata().Name,
        "instructions":         instructions,
        "available_scripts":    t.skill.ListScripts(),
        "available_references": t.skill.ListReferences(),
        "available_assets":     t.skill.ListAssets(),
    }

    return response, nil
}

// SkillScriptTool handles script execution
type SkillScriptTool struct {
    skill      Skill
    scriptName string
}

func (t *SkillScriptTool) Name() string {
    return fmt.Sprintf("run_%s_%s",
                      t.skill.Metadata().Name,
                      sanitizeToolName(t.scriptName))
}

func (t *SkillScriptTool) Description() string {
    return fmt.Sprintf("Execute %s script from %s skill",
                      t.scriptName, t.skill.Metadata().Name)
}

func (t *SkillScriptTool) IsLongRunning() bool {
    return true // Scripts may take time to execute
}

func (t *SkillScriptTool) Call(ctx context.Context, toolCtx tool.Context,
                              args map[string]any) (any, error) {

    // Extract script arguments
    scriptArgs, ok := args["args"].([]string)
    if !ok {
        scriptArgs = []string{}
    }

    // Load script content
    scriptContent, err := t.skill.LoadScript(t.scriptName)
    if err != nil {
        return nil, fmt.Errorf("failed to load script: %w", err)
    }

    // Execute script
    executor := NewScriptExecutor(t.skill.Metadata().ADK)
    result, err := executor.Execute(ctx, t.scriptName, scriptContent, scriptArgs)
    if err != nil {
        return nil, fmt.Errorf("script execution failed: %w", err)
    }

    return result, nil
}

// SkillReferenceTool handles reference document loading
type SkillReferenceTool struct {
    skill         Skill
    referenceName string
}

func (t *SkillReferenceTool) Name() string {
    return fmt.Sprintf("load_%s_%s",
                      t.skill.Metadata().Name,
                      sanitizeToolName(t.referenceName))
}

func (t *SkillReferenceTool) Description() string {
    return fmt.Sprintf("Load %s reference from %s skill",
                      t.referenceName, t.skill.Metadata().Name)
}

func (t *SkillReferenceTool) IsLongRunning() bool {
    return false
}

func (t *SkillReferenceTool) Call(ctx context.Context, toolCtx tool.Context,
                                 args map[string]any) (any, error) {

    content, err := t.skill.LoadReference(t.referenceName)
    if err != nil {
        return nil, fmt.Errorf("failed to load reference: %w", err)
    }

    response := map[string]any{
        "reference": t.referenceName,
        "content":   string(content),
    }

    return response, nil
}

func sanitizeToolName(name string) string {
    // Replace non-alphanumeric characters with underscores
    return strings.Map(func(r rune) rune {
        if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
            return r
        }
        return '_'
    }, name)
}
```

## Progressive Disclosure Implementation

### Stage 1: Discovery (Startup)

During agent initialization, only skill metadata is loaded:

```go
// Minimal context usage - ~100 tokens per skill
func (l *Loader) GenerateDiscoveryPrompt() string {
    // Returns XML with just name/description for each skill
    return "<available_skills>...</available_skills>"
}
```

### Stage 2: Activation (Task Matching)

When LLM determines a skill is relevant:

```go
// LLM calls: activate_pdf_processing()
// Returns: full instructions + available resources list
func (t *SkillActivationTool) Call(...) (any, error) {
    // Load full SKILL.md content (~2-5K tokens)
    instructions, err := t.skill.Instructions()

    return map[string]any{
        "instructions":         instructions,
        "available_scripts":    t.skill.ListScripts(),
        "available_references": t.skill.ListReferences(),
    }, nil
}
```

### Stage 3: Execution (Resource Access)

When specific resources are needed:

```go
// LLM calls: run_pdf_processing_extract_text(args=["file.pdf"])
// Loads script on-demand and executes it
func (t *SkillScriptTool) Call(...) (any, error) {
    scriptContent, err := t.skill.LoadScript(t.scriptName)
    // Execute and return results
}
```

### Context Usage Optimization

```
Stage 1 (Discovery):   ~500 tokens total (5 skills × 100 tokens)
Stage 2 (Activation):  ~3,000 tokens for one skill's full instructions
Stage 3 (Execution):   Variable based on script output
```

This approach allows skills to bundle effectively unlimited content while keeping the agent's working context manageable.

## Security Considerations

### Script Execution Safety

```go
type ScriptExecutor struct {
    config   *ADKConfig
    sandbox  Sandbox
    timeout  time.Duration
    memLimit int64
}

type ExecutionResult struct {
    Success        bool          `json:"success"`
    Stdout         string        `json:"stdout"`
    Stderr         string        `json:"stderr"`
    ExitCode       int           `json:"exit_code"`
    ExecutionTime  time.Duration `json:"execution_time"`
    MemoryUsed     int64         `json:"memory_used"`
}

func (e *ScriptExecutor) Execute(ctx context.Context, name string,
                                content []byte, args []string) (*ExecutionResult, error) {

    // Create isolated execution environment
    env, err := e.sandbox.CreateEnvironment(SandboxConfig{
        AllowNetwork:    e.config.Security.AllowNetwork,
        AllowFileSystem: e.config.Security.AllowFileSystem,
        MemoryLimit:     e.config.Security.MemoryLimitMB,
        TimeLimit:       time.Duration(e.config.Security.TimeoutSeconds) * time.Second,
        AllowedCommands: e.config.Security.AllowedCommands,
    })
    if err != nil {
        return nil, fmt.Errorf("failed to create sandbox: %w", err)
    }
    defer env.Cleanup()

    // Execute with timeout
    ctx, cancel := context.WithTimeout(ctx, e.timeout)
    defer cancel()

    result, err := env.Execute(ctx, name, content, args)
    if err != nil {
        return nil, fmt.Errorf("execution failed: %w", err)
    }

    return result, nil
}
```

### Sandbox Implementation

```go
type Sandbox interface {
    CreateEnvironment(config SandboxConfig) (SandboxEnvironment, error)
}

type SandboxEnvironment interface {
    Execute(ctx context.Context, name string, content []byte, args []string) (*ExecutionResult, error)
    Cleanup() error
}

type SandboxConfig struct {
    AllowNetwork    bool
    AllowFileSystem bool
    MemoryLimit     int64
    TimeLimit       time.Duration
    AllowedCommands []string
    WorkingDir      string
}

// Implementation options:
// 1. Docker containers (production)
// 2. chroot/namespace isolation (Linux)
// 3. Process isolation with resource limits (basic)
// 4. WASM sandbox for supported languages (future)
```

### Security Validation

```go
func ValidateSkill(skillPath string) error {
    // 1. Validate SKILL.md structure
    metadata, instructions, err := parseSkillMD(filepath.Join(skillPath, "SKILL.md"))
    if err != nil {
        return fmt.Errorf("invalid SKILL.md: %w", err)
    }

    // 2. Validate directory structure
    if err := validateDirectory(skillPath); err != nil {
        return fmt.Errorf("invalid directory structure: %w", err)
    }

    // 3. Scan scripts for known dangerous patterns
    if err := scanScriptsForSecurity(skillPath); err != nil {
        return fmt.Errorf("security violation in scripts: %w", err)
    }

    // 4. Validate file permissions
    if err := validatePermissions(skillPath); err != nil {
        return fmt.Errorf("invalid permissions: %w", err)
    }

    return nil
}

func scanScriptsForSecurity(skillPath string) error {
    scriptsDir := filepath.Join(skillPath, "scripts")
    entries, err := os.ReadDir(scriptsDir)
    if os.IsNotExist(err) {
        return nil // No scripts directory is fine
    }
    if err != nil {
        return err
    }

    for _, entry := range entries {
        if entry.IsDir() {
            continue
        }

        scriptPath := filepath.Join(scriptsDir, entry.Name())
        content, err := os.ReadFile(scriptPath)
        if err != nil {
            return fmt.Errorf("failed to read %s: %w", scriptPath, err)
        }

        // Check for dangerous patterns
        dangerousPatterns := []string{
            "rm -rf /",
            "format c:",
            "del /f /s /q",
            "sudo rm",
            "> /dev/sda",
        }

        contentStr := string(content)
        for _, pattern := range dangerousPatterns {
            if strings.Contains(contentStr, pattern) {
                return fmt.Errorf("dangerous pattern '%s' found in %s", pattern, entry.Name())
            }
        }
    }

    return nil
}
```

### Tool Confirmation Integration

Skills integrate with ADK-Go's existing tool confirmation system:

```go
func (t *SkillScriptTool) Call(ctx context.Context, toolCtx tool.Context,
                              args map[string]any) (any, error) {

    // Check if script requires confirmation
    if t.requiresConfirmation() {
        confirmation := toolCtx.ToolConfirmation()
        if confirmation == nil {
            // Request confirmation from user
            payload := map[string]any{
                "skill":  t.skill.Metadata().Name,
                "script": t.scriptName,
                "args":   args,
            }
            return nil, toolCtx.RequestConfirmation(
                fmt.Sprintf("Execute %s script?", t.scriptName), payload)
        }

        if !confirmation.IsApproved() {
            return nil, fmt.Errorf("script execution not approved")
        }
    }

    // Proceed with execution...
}

func (t *SkillScriptTool) requiresConfirmation() bool {
    // Scripts that modify files, make network calls, etc.
    // This could be configured in SKILL.md frontmatter
    metadata := t.skill.Metadata()

    if metadata.ADK != nil && metadata.ADK.Security != nil {
        return metadata.ADK.Security.AllowNetwork ||
               metadata.ADK.Security.AllowFileSystem
    }

    return true // Default to requiring confirmation
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (2-3 weeks)

**Goal**: Basic skill loading and discovery

**Components**:
- `skill/` package with core interfaces
- SKILL.md parser with YAML frontmatter support
- Basic skill loader for directory discovery
- Skill-to-toolset adapter
- Unit tests for parsing and loading

**Deliverables**:
- Skills can be discovered from directories
- SKILL.md files can be parsed
- Skills appear as toolsets in agent configuration
- Basic validation for skill structure

**Example Usage**:
```go
loader := skill.NewLoader()
loader.AddDirectory("./skills")

agent, err := llmagent.New(llmagent.Config{
    Name:     "test_agent",
    Model:    model,
    Toolsets: loader.AsToolsets(),
})
```

### Phase 2: Progressive Disclosure (2-3 weeks)

**Goal**: Three-stage loading implementation

**Components**:
- Skill activation tools
- Progressive tool registration
- Context-aware tool filtering
- Enhanced discovery prompt generation

**Deliverables**:
- Skills only load metadata initially
- LLM can activate skills to get instructions
- Tool lists expand based on activation state
- Discovery prompts include resource indicators

### Phase 3: Script Execution (3-4 weeks)

**Goal**: Safe script execution capability

**Components**:
- Script executor with sandbox support
- Support for Python, Bash, JavaScript
- Resource monitoring (time, memory)
- Basic security validation

**Deliverables**:
- Scripts can be executed with arguments
- Basic sandboxing prevents system damage
- Execution results include stdout/stderr
- Timeout and memory limits enforced

### Phase 4: Reference and Asset Support (1-2 weeks)

**Goal**: Complete Agent Skills standard support

**Components**:
- Reference document loading
- Asset file access
- Enhanced toolset with all resource types

**Deliverables**:
- References can be loaded on-demand
- Asset paths can be retrieved
- Full compatibility with Agent Skills standard

### Phase 5: Enhanced Security and Observability (2-3 weeks)

**Goal**: Production-ready security and monitoring

**Components**:
- Advanced sandboxing (Docker, containers)
- Security scanning for skill validation
- Comprehensive logging and metrics
- Tool confirmation integration

**Deliverables**:
- Production-grade sandbox implementation
- Security validation prevents dangerous skills
- Rich observability for skill usage
- Integration with ADK confirmation system

### Phase 6: Documentation and Examples (1-2 weeks)

**Goal**: Developer experience and adoption

**Components**:
- Comprehensive documentation
- Example skills covering common patterns
- Migration guides
- Best practices documentation

**Deliverables**:
- Complete API documentation
- Working example skills
- Integration guide for existing agents
- Security best practices guide

## Testing Strategy

### Unit Tests

```go
func TestSkillLoader(t *testing.T) {
    // Test skill discovery and loading
    loader := skill.NewLoader()
    testSkillDir := createTestSkill(t)

    err := loader.AddDirectory(testSkillDir)
    assert.NoError(t, err)

    skills := loader.Skills()
    assert.Len(t, skills, 1)

    skill := skills[0]
    assert.Equal(t, "test-skill", skill.Metadata().Name)
}

func TestSkillMetadataParsing(t *testing.T) {
    skillMD := `---
name: test-skill
description: A test skill for unit testing
license: Apache-2.0
---

# Test Skill

This is a test skill.`

    metadata, instructions, err := parseSkillMD([]byte(skillMD))
    assert.NoError(t, err)
    assert.Equal(t, "test-skill", metadata.Name)
    assert.Contains(t, instructions, "This is a test skill")
}

func TestProgressiveDisclosure(t *testing.T) {
    skill := createTestSkill(t)

    // Stage 1: Discovery
    assert.Equal(t, skill.StageDiscovery, skill.Stage())
    tools, err := skill.Tools(mockContext())
    assert.NoError(t, err)
    assert.Len(t, tools, 1) // Only activation tool

    // Stage 2: Activation
    err = skill.Activate()
    assert.NoError(t, err)
    assert.Equal(t, skill.StageActivation, skill.Stage())
    tools, err = skill.Tools(mockContext())
    assert.NoError(t, err)
    assert.Greater(t, len(tools), 1) // Activation + script tools
}
```

### Integration Tests

```go
func TestSkillInAgent(t *testing.T) {
    // Create test skill directory
    skillDir := createTestSkillWithScript(t, `
#!/bin/bash
echo "Hello from skill script"
exit 0
`)

    // Load skill
    loader := skill.NewLoader()
    err := loader.AddDirectory(skillDir)
    assert.NoError(t, err)

    // Create agent with skill
    model := &mockModel{}
    agent, err := llmagent.New(llmagent.Config{
        Name:     "test_agent",
        Model:    model,
        Toolsets: loader.AsToolsets(),
    })
    assert.NoError(t, err)

    // Test skill activation
    ctx := &mockInvocationContext{}
    events := []session.Event{}
    for event, err := range agent.Run(ctx) {
        assert.NoError(t, err)
        events = append(events, *event)
    }

    // Verify skill tools are available
    assert.Contains(t, getToolNames(agent), "activate_test_skill")
}
```

### Security Tests

```go
func TestSkillSecurity(t *testing.T) {
    tests := []struct {
        name         string
        script       string
        expectError  bool
        errorPattern string
    }{
        {
            name:         "safe script",
            script:       "#!/bin/bash\necho 'hello world'\n",
            expectError:  false,
        },
        {
            name:         "dangerous rm command",
            script:       "#!/bin/bash\nrm -rf /\n",
            expectError:  true,
            errorPattern: "dangerous pattern",
        },
        {
            name:         "file system access",
            script:       "#!/bin/bash\ncat /etc/passwd\n",
            expectError:  false, // Allowed in sandbox
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            skillDir := createTestSkillWithScript(t, tt.script)
            err := skill.ValidateSkill(skillDir)

            if tt.expectError {
                assert.Error(t, err)
                assert.Contains(t, err.Error(), tt.errorPattern)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

### Performance Tests

```go
func BenchmarkSkillDiscovery(b *testing.B) {
    // Create 100 test skills
    skillDirs := make([]string, 100)
    for i := 0; i < 100; i++ {
        skillDirs[i] = createTestSkill(b, fmt.Sprintf("skill-%d", i))
    }

    b.ResetTimer()
    for n := 0; n < b.N; n++ {
        loader := skill.NewLoader()
        for _, dir := range skillDirs {
            loader.AddDirectory(dir)
        }

        skills := loader.Skills()
        if len(skills) != 100 {
            b.Fatalf("expected 100 skills, got %d", len(skills))
        }
    }
}

func BenchmarkDiscoveryPromptGeneration(b *testing.B) {
    loader := skill.NewLoader()
    // Add test skills...

    b.ResetTimer()
    for n := 0; n < b.N; n++ {
        prompt := loader.GenerateDiscoveryPrompt()
        if len(prompt) == 0 {
            b.Fatal("empty prompt generated")
        }
    }
}
```

### End-to-End Tests

```go
func TestRealSkillExecution(t *testing.T) {
    // Use actual Anthropic skills repository for testing
    if testing.Short() {
        t.Skip("skipping e2e test in short mode")
    }

    // Clone anthropic skills repo
    skillsRepo := cloneAnthropicSkills(t)

    // Load PDF processing skill
    loader := skill.NewLoader()
    err := loader.AddDirectory(filepath.Join(skillsRepo, "pdf"))
    assert.NoError(t, err)

    // Test with real agent and model
    // This would require actual API keys and external resources
}
```

## Migration and Compatibility

### Backward Compatibility

The skills implementation maintains full backward compatibility:

```go
// Existing ADK-Go code continues to work unchanged
agent, err := llmagent.New(llmagent.Config{
    Name:  "existing_agent",
    Model: model,
    Tools: []tool.Tool{
        &customTool{},
        geminitool.GoogleSearch{},
    },
})

// Skills are additive - added via toolsets
skillLoader := skill.NewLoader()
skillLoader.AddDirectory("./skills")

// Combine existing tools with skills
agentWithSkills, err := llmagent.New(llmagent.Config{
    Name:     "enhanced_agent",
    Model:    model,
    Tools:    existingTools,
    Toolsets: skillLoader.AsToolsets(), // Add skills
})
```

### Migration Path for Existing Tools

Existing tools can be packaged as skills for reusability:

```go
// Existing tool
type WeatherTool struct{}

func (t *WeatherTool) Name() string { return "get_weather" }
func (t *WeatherTool) Description() string { return "Get current weather" }
func (t *WeatherTool) Call(...) (any, error) { ... }

// Convert to skill format
func CreateWeatherSkill() Skill {
    return &toolBasedSkill{
        name:        "weather",
        description: "Get current weather information",
        tools:       []tool.Tool{&WeatherTool{}},
    }
}
```

### Gradual Adoption

Organizations can adopt skills incrementally:

1. **Phase 1**: Use existing tools alongside skills
2. **Phase 2**: Convert high-value tools to skill format for sharing
3. **Phase 3**: Develop new capabilities as skills by default

## Future Considerations

### Remote Skills Support

```go
type RemoteSkillLoader struct {
    registryURL string
    cache       SkillCache
}

func (l *RemoteSkillLoader) LoadSkill(name, version string) (Skill, error) {
    // Download skill package from registry
    // Verify signatures and checksums
    // Cache locally
    // Load as standard skill
}
```

### Skill Registries

Support for centralized skill distribution:

```go
type SkillRegistry interface {
    Search(query string) ([]SkillMetadata, error)
    Download(name, version string) ([]byte, error)
    Publish(skill Skill) error
    Verify(skill Skill) error
}
```

### WASM Sandbox

WebAssembly-based sandboxing for enhanced security:

```go
type WASMSandbox struct {
    runtime *wasmtime.Engine
}

func (s *WASMSandbox) Execute(script []byte) (*ExecutionResult, error) {
    // Compile to WASM
    // Execute in isolated environment
    // Return results
}
```

### Skill Composition

Advanced patterns for combining skills:

```go
type CompositeSkill struct {
    name   string
    skills []Skill
}

func (s *CompositeSkill) Tools(ctx agent.ReadonlyContext) ([]tool.Tool, error) {
    // Combine tools from multiple skills
    // Handle name conflicts
    // Provide unified interface
}
```

### Performance Optimizations

1. **Lazy Loading**: Load skill components only when needed
2. **Caching**: Cache parsed metadata and instructions
3. **Parallel Discovery**: Discover skills from multiple directories concurrently
4. **Precompilation**: Pre-parse and validate skills at build time

### Observability Enhancements

```go
type SkillMetrics interface {
    RecordSkillActivation(skillName string, duration time.Duration)
    RecordScriptExecution(skillName, scriptName string, result *ExecutionResult)
    RecordResourceAccess(skillName, resourceType, resourceName string)
}

type SkillTracer interface {
    StartSkillActivation(ctx context.Context, skillName string) (context.Context, SpanFinisher)
    StartScriptExecution(ctx context.Context, skillName, scriptName string) (context.Context, SpanFinisher)
}
```

## Appendix

### Example Skill Structure

```
example-pdf-processing/
├── SKILL.md                   # Required: metadata + instructions
├── scripts/                   # Optional: executable code
│   ├── extract_text.py       # Python script for text extraction
│   ├── merge_pdfs.sh         # Bash script for PDF merging
│   └── validate_form.js      # JavaScript for form validation
├── references/               # Optional: additional docs
│   ├── FORMS.md             # Detailed form handling guide
│   └── TROUBLESHOOTING.md   # Common issues and solutions
└── assets/                  # Optional: static resources
    ├── templates/
    │   └── invoice.pdf      # PDF template
    └── schemas/
        └── form_schema.json # JSON schema for forms
```

### Example SKILL.md

```yaml
---
name: pdf-processing
description: Extract text and tables from PDF files, fill PDF forms, and merge multiple PDFs. Use when working with PDF documents.
license: Apache-2.0
compatibility: Requires Python 3.8+, pdfplumber, PyPDF2 packages
metadata:
  author: example-org
  version: "1.2.0"
  category: documents
adk:
  security:
    allow_filesystem: true
    allow_network: false
    timeout_seconds: 120
    memory_limit_mb: 256
  scripts:
    interpreters:
      python: "python3"
    environment:
      PYTHONPATH: "/opt/pdf-tools"
---

# PDF Processing Skill

## When to use this skill

Use this skill when the user needs to:
- Extract text from PDF documents
- Extract tables and structured data from PDFs
- Fill in PDF forms programmatically
- Merge multiple PDF files into one
- Split PDF files into separate documents

## Prerequisites

- Python 3.8 or higher
- Required packages: pdfplumber, PyPDF2, reportlab
- For OCR functionality: tesseract-ocr

## Instructions

### Text Extraction

Use the `extract_text.py` script to extract text from PDF files:

```bash
python scripts/extract_text.py input.pdf --output text_output.txt
```

Optional parameters:
- `--pages 1-5`: Extract from specific page range
- `--format json`: Output as structured JSON
- `--ocr`: Enable OCR for scanned documents

### Table Extraction

Extract tables using the table extraction functionality:

```bash
python scripts/extract_text.py input.pdf --tables --output tables.csv
```

### Form Filling

Fill PDF forms using the form filling script:

```bash
python scripts/fill_form.py template.pdf data.json output.pdf
```

The data.json file should contain field names and values:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "date": "2025-01-29"
}
```

## Advanced Usage

See the [Forms Reference](references/FORMS.md) for detailed form handling instructions.

For troubleshooting common issues, check [Troubleshooting Guide](references/TROUBLESHOOTING.md).

## Security Considerations

This skill requires filesystem access to read and write PDF files. Scripts are executed in a sandboxed environment with:
- No network access
- Limited to /tmp and specified input directories
- 2-minute execution timeout
- 256MB memory limit
```

### Tool Integration Example

```go
func main() {
    ctx := context.Background()

    // Create model
    model, err := gemini.NewModel(ctx, "gemini-2.5-flash", &genai.ClientConfig{
        APIKey: os.Getenv("GOOGLE_API_KEY"),
    })
    if err != nil {
        log.Fatalf("Failed to create model: %v", err)
    }

    // Load skills
    skillLoader := skill.NewLoader()
    skillLoader.AddDirectory("./anthropic-skills/skills")
    skillLoader.AddDirectory("./custom-skills")

    // Create agent with skills + traditional tools
    agent, err := llmagent.New(llmagent.Config{
        Name:        "document_assistant",
        Model:       model,
        Description: "AI assistant with document processing capabilities",
        Instruction: fmt.Sprintf(`You are a helpful assistant specialized in document processing.

%s

To use a skill:
1. First activate it to get detailed instructions
2. Follow the instructions to use specific tools
3. Execute scripts when needed for complex operations

Always explain what you're doing and ask for confirmation before running scripts.`,
            skillLoader.GenerateDiscoveryPrompt()),

        // Combine skills with existing tools
        Tools: []tool.Tool{
            geminitool.GoogleSearch{},
        },
        Toolsets: skillLoader.AsToolsets(),
    })
    if err != nil {
        log.Fatalf("Failed to create agent: %v", err)
    }

    // Launch agent
    config := &launcher.Config{
        AgentLoader: agent.NewSingleLoader(agent),
    }

    l := full.NewLauncher()
    if err = l.Execute(ctx, config, os.Args[1:]); err != nil {
        log.Fatalf("Run failed: %v", err)
    }
}
```

This design provides a comprehensive foundation for implementing Agent Skills in ADK-Go while maintaining compatibility with the current architecture and ensuring robust security and performance characteristics.
