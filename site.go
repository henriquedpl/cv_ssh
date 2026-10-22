package main

import (
	"embed"
	"encoding/json"
	"html/template"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

//go:embed web
var webFS embed.FS

// buildSite renders the website from the CV into dir: index.html from the
// template, plus every other file under web/ copied as is.
func buildSite(cv *CV, dir string) error {
	data, err := json.Marshal(cv)
	if err != nil {
		return err
	}
	tmpl, err := template.New("index.html.tmpl").Funcs(template.FuncMap{
		"cvJSON": func() template.JS { return template.JS(data) },
		"trim":   strings.TrimSpace,
		"join":   strings.Join,
	}).ParseFS(webFS, "web/index.html.tmpl")
	if err != nil {
		return err
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	f, err := os.Create(filepath.Join(dir, "index.html"))
	if err != nil {
		return err
	}
	defer f.Close()
	if err := tmpl.Execute(f, cv); err != nil {
		return err
	}

	return fs.WalkDir(webFS, "web", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || strings.HasSuffix(path, ".tmpl") {
			return err
		}
		b, err := webFS.ReadFile(path)
		if err != nil {
			return err
		}
		out := filepath.Join(dir, strings.TrimPrefix(path, "web/"))
		if err := os.MkdirAll(filepath.Dir(out), 0o755); err != nil {
			return err
		}
		return os.WriteFile(out, b, 0o644)
	})
}
