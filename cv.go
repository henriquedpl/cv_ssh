package main

import (
	_ "embed"

	"gopkg.in/yaml.v3"
)

//go:embed cv.yaml
var cvYAML []byte

type CV struct {
	Name     string `yaml:"name"`
	Headline string `yaml:"headline"`
	Summary  string `yaml:"summary"`
	Contact  struct {
		Email    string `yaml:"email"`
		LinkedIn string `yaml:"linkedin"`
		GitHub   string `yaml:"github"`
	} `yaml:"contact"`
	Experience     []Job           `yaml:"experience"`
	Projects       []Project       `yaml:"projects"`
	Skills         []SkillGroup    `yaml:"skills"`
	Education      []Education     `yaml:"education"`
	Certifications []Certification `yaml:"certifications"`
}

type Job struct {
	Role     string   `yaml:"role"`
	Company  string   `yaml:"company"`
	Location string   `yaml:"location"`
	Period   string   `yaml:"period"`
	Bullets  []string `yaml:"bullets"`
}

type Project struct {
	Name    string   `yaml:"name"`
	Stack   string   `yaml:"stack"`
	URL     string   `yaml:"url"`
	Bullets []string `yaml:"bullets"`
}

type SkillGroup struct {
	Category string   `yaml:"category"`
	Items    []string `yaml:"items"`
}

type Education struct {
	School   string `yaml:"school"`
	Degree   string `yaml:"degree"`
	Location string `yaml:"location"`
	Date     string `yaml:"date"`
}

type Certification struct {
	Name   string   `yaml:"name"`
	Issuer string   `yaml:"issuer"`
	Date   string   `yaml:"date"`
	Items  []string `yaml:"items"`
}

func loadCV() (*CV, error) {
	var cv CV
	if err := yaml.Unmarshal(cvYAML, &cv); err != nil {
		return nil, err
	}
	return &cv, nil
}
