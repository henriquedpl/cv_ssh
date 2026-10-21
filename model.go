package main

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

const maxWidth = 96

var tabNames = [...]string{"About", "Experience", "Projects", "Skills", "Education", "Contact"}

const (
	tabAbout = iota
	tabExperience
	tabProjects
	tabSkills
	tabEducation
	tabContact
)

type styles struct {
	name, headline       lipgloss.Style
	tab, activeTab       lipgloss.Style
	title, selectedTitle lipgloss.Style
	subtle, accent, text lipgloss.Style
	chip, label, help    lipgloss.Style
	border               lipgloss.Style
}

func newStyles(r *lipgloss.Renderer) styles {
	// Tokyo Night (dark) / Tokyo Night Day (light)
	accent := lipgloss.AdaptiveColor{Light: "#2E7DE9", Dark: "#7AA2F7"}
	subtle := lipgloss.AdaptiveColor{Light: "#6172B0", Dark: "#737AA2"}
	text := lipgloss.AdaptiveColor{Light: "#3760BF", Dark: "#C0CAF5"}
	// Explicit fallbacks: SSH doesn't forward COLORTERM, so most clients get
	// 256 colors, where #292E42 would otherwise round to navy.
	chipBg := lipgloss.CompleteAdaptiveColor{
		Light: lipgloss.CompleteColor{TrueColor: "#D5D6DB", ANSI256: "253", ANSI: "7"},
		Dark:  lipgloss.CompleteColor{TrueColor: "#292E42", ANSI256: "236", ANSI: "8"},
	}
	onAccent := lipgloss.AdaptiveColor{Light: "#FFFFFF", Dark: "#1A1B26"}

	return styles{
		name:          r.NewStyle().Bold(true).Foreground(accent),
		headline:      r.NewStyle().Foreground(subtle),
		tab:           r.NewStyle().Foreground(subtle).Padding(0, 1),
		activeTab:     r.NewStyle().Bold(true).Foreground(onAccent).Background(accent).Padding(0, 1),
		title:         r.NewStyle().Foreground(text),
		selectedTitle: r.NewStyle().Bold(true).Foreground(accent),
		subtle:        r.NewStyle().Foreground(subtle),
		accent:        r.NewStyle().Foreground(accent),
		text:          r.NewStyle().Foreground(text),
		chip:          r.NewStyle().Foreground(text).Background(chipBg).Padding(0, 1),
		label:         r.NewStyle().Bold(true).Foreground(text),
		help:          r.NewStyle().Foreground(subtle),
		border:        r.NewStyle().Foreground(subtle),
	}
}

type model struct {
	cv            *CV
	st            styles
	width, height int
	active        int
	cursor        [len(tabNames)]int
	vp            viewport.Model
}

func newModel(cv *CV, r *lipgloss.Renderer, width, height int) model {
	m := model{cv: cv, st: newStyles(r), vp: viewport.New(0, 0)}
	m.resize(width, height)
	return m
}

func (m model) Init() tea.Cmd { return nil }

func (m *model) contentWidth() int {
	return max(min(m.width-4, maxWidth), 20)
}

func (m *model) resize(w, h int) {
	m.width, m.height = w, h
	m.vp.Width = m.contentWidth()
	m.vp.Height = max(h-lipgloss.Height(m.header())-lipgloss.Height(m.footer()), 3)
	m.refresh(false)
}

// listLen returns how many selectable items the active tab has (0 = plain scrolling tab).
func (m *model) listLen() int {
	switch m.active {
	case tabExperience:
		return len(m.cv.Experience)
	case tabProjects:
		return len(m.cv.Projects)
	}
	return 0
}

func (m *model) setTab(i int) {
	m.active = (i + len(tabNames)) % len(tabNames)
	m.vp.GotoTop()
	m.refresh(true)
}

func (m *model) refresh(follow bool) {
	content, selStart, selEnd := m.renderBody()
	m.vp.SetContent(content)
	if !follow || m.listLen() == 0 {
		return
	}
	// Keep the selected item in view.
	if selEnd > m.vp.YOffset+m.vp.Height {
		m.vp.SetYOffset(selEnd - m.vp.Height)
	}
	if selStart < m.vp.YOffset {
		m.vp.SetYOffset(selStart)
	}
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.resize(msg.Width, msg.Height)
		return m, nil

	case tea.KeyMsg:
		// Keys typed in quick succession (or held down) can arrive over SSH as
		// a single message with several runes; handle them one at a time.
		if msg.Type == tea.KeyRunes && len(msg.Runes) > 1 && !msg.Paste {
			var model tea.Model = m
			var cmds []tea.Cmd
			for _, r := range msg.Runes {
				var cmd tea.Cmd
				model, cmd = model.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{r}})
				cmds = append(cmds, cmd)
			}
			return model, tea.Batch(cmds...)
		}

		key := msg.String()
		switch key {
		case "q", "esc", "ctrl+c":
			return m, tea.Quit
		case "tab", "right", "l":
			m.setTab(m.active + 1)
			return m, nil
		case "shift+tab", "left", "h":
			m.setTab(m.active - 1)
			return m, nil
		case "1", "2", "3", "4", "5", "6":
			m.setTab(int(key[0] - '1'))
			return m, nil
		}

		if n := m.listLen(); n > 0 {
			c := &m.cursor[m.active]
			switch key {
			case "up", "k":
				*c = (*c - 1 + n) % n
				m.refresh(true)
				return m, nil
			case "down", "j":
				*c = (*c + 1) % n
				m.refresh(true)
				return m, nil
			case "home", "g":
				*c = 0
				m.refresh(true)
				return m, nil
			case "end", "G":
				*c = n - 1
				m.refresh(true)
				return m, nil
			}
		}
	}

	var cmd tea.Cmd
	m.vp, cmd = m.vp.Update(msg)
	return m, cmd
}

func (m model) View() string {
	view := lipgloss.JoinVertical(lipgloss.Left, m.header(), m.vp.View(), m.footer())
	return lipgloss.PlaceHorizontal(m.width, lipgloss.Center, view)
}

func (m model) header() string {
	w := m.contentWidth()
	title := m.st.name.Render(m.cv.Name) + "  " + m.st.headline.Render(m.cv.Headline)
	if lipgloss.Width(title) > w {
		title = m.st.name.Render(m.cv.Name)
	}

	// Numbered tabs when they fit, plain names on narrower terminals, and
	// just the active section as a last resort.
	renderTabs := func(numbered bool) string {
		var tabs []string
		for i, name := range tabNames {
			label := name
			if numbered {
				label = fmt.Sprintf("%d %s", i+1, name)
			}
			if i == m.active {
				tabs = append(tabs, m.st.activeTab.Render(label))
			} else {
				tabs = append(tabs, m.st.tab.Render(label))
			}
		}
		return strings.Join(tabs, "")
	}
	bar := renderTabs(true)
	if lipgloss.Width(bar) > w {
		bar = renderTabs(false)
	}
	if lipgloss.Width(bar) > w {
		bar = m.st.tab.Render("‹") + m.st.activeTab.Render(tabNames[m.active]) +
			m.st.tab.Render(fmt.Sprintf("› %d/%d", m.active+1, len(tabNames)))
	}

	rule := m.st.border.Render(strings.Repeat("─", w))
	return lipgloss.JoinVertical(lipgloss.Left, "", title, "", bar, rule)
}

func (m model) footer() string {
	w := m.contentWidth()
	help := "←/→ sections • q quit"
	if m.listLen() > 0 {
		help = "←/→ sections • ↑/↓ select • pgup/pgdn scroll • q quit"
	} else if m.vp.TotalLineCount() > m.vp.Height {
		help = "←/→ sections • ↑/↓ scroll • q quit"
	}
	rule := m.st.border.Render(strings.Repeat("─", w))
	return lipgloss.JoinVertical(lipgloss.Left, rule, m.st.help.Render(help))
}

// renderBody renders the active tab and reports the line range of the selected item.
func (m model) renderBody() (string, int, int) {
	w := m.contentWidth()
	switch m.active {
	case tabExperience:
		return m.renderAccordion(w, len(m.cv.Experience), func(i int, open bool) string {
			j := m.cv.Experience[i]
			return m.item(w, open, j.Role+" · "+j.Company, j.Period, j.Location, j.Bullets, "")
		})
	case tabProjects:
		return m.renderAccordion(w, len(m.cv.Projects), func(i int, open bool) string {
			p := m.cv.Projects[i]
			return m.item(w, open, p.Name, "", p.Stack, p.Bullets, p.URL)
		})
	case tabSkills:
		return m.renderSkills(w), 0, 0
	case tabEducation:
		return m.renderEducation(w), 0, 0
	case tabContact:
		return m.renderContact(), 0, 0
	}
	return m.renderAbout(w), 0, 0
}

func (m model) renderAccordion(w, n int, render func(i int, open bool) string) (string, int, int) {
	var b strings.Builder
	line, selStart, selEnd := 0, 0, 0
	b.WriteString("\n")
	line++
	for i := range n {
		open := i == m.cursor[m.active]
		block := render(i, open)
		if open {
			selStart = line
			selEnd = line + lipgloss.Height(block)
		}
		b.WriteString(block + "\n")
		line += lipgloss.Height(block)
	}
	return b.String(), selStart, selEnd
}

// item renders one accordion entry; bullets and details only appear when it is open.
func (m model) item(w int, open bool, title, right, sub string, bullets []string, url string) string {
	marker, ts := "  ", m.st.title
	if open {
		marker, ts = m.st.accent.Render("▸ "), m.st.selectedTitle
	}
	left := marker + ts.Render(title)
	line := left
	if right != "" {
		r := m.st.subtle.Render(right)
		if gap := w - lipgloss.Width(left) - lipgloss.Width(r); gap >= 2 {
			line = left + strings.Repeat(" ", gap) + r
		} else {
			line = left + "\n  " + r
		}
	}
	if !open {
		return line
	}

	lines := []string{line}
	if sub != "" {
		lines = append(lines, "  "+m.st.subtle.Render(sub))
	}
	lines = append(lines, "")
	for _, bl := range bullets {
		lines = append(lines, m.bullet(w, bl))
	}
	if url != "" {
		lines = append(lines, "", "  "+m.st.accent.Render("↗ "+url))
	}
	lines = append(lines, "")
	return strings.Join(lines, "\n")
}

func (m model) bullet(w int, s string) string {
	wrapped := strings.Split(m.st.text.Width(w-6).Render(s), "\n")
	for i := range wrapped {
		if i == 0 {
			wrapped[i] = "  " + m.st.accent.Render("•") + " " + wrapped[i]
		} else {
			wrapped[i] = "    " + wrapped[i]
		}
	}
	return strings.Join(wrapped, "\n")
}

func (m model) renderAbout(w int) string {
	cv := m.cv
	stats := []string{
		m.st.chip.Render(fmt.Sprintf("%d roles", len(cv.Experience))),
		m.st.chip.Render(fmt.Sprintf("%d projects", len(cv.Projects))),
		m.st.chip.Render(fmt.Sprintf("%d certifications", len(cv.Certifications))),
	}
	latest := ""
	if len(cv.Experience) > 0 {
		j := cv.Experience[0]
		latest = m.st.subtle.Render("Currently  ") + m.st.label.Render(j.Role) + m.st.subtle.Render(" at ") + m.st.accent.Render(j.Company)
	}
	return lipgloss.JoinVertical(lipgloss.Left,
		"",
		m.st.text.Width(w).Render(strings.TrimSpace(cv.Summary)),
		"",
		latest,
		"",
		strings.Join(stats, " "),
		"",
		m.st.subtle.Render("Press → or 2 to see my experience."),
	)
}

func (m model) renderSkills(w int) string {
	var blocks []string
	blocks = append(blocks, "")
	for _, g := range m.cv.Skills {
		var rows []string
		row := ""
		for _, it := range g.Items {
			chip := m.st.chip.Render(it)
			if row != "" && lipgloss.Width(row)+1+lipgloss.Width(chip) > w {
				rows = append(rows, row)
				row = ""
			}
			if row != "" {
				row += " "
			}
			row += chip
		}
		rows = append(rows, row)
		blocks = append(blocks, m.st.label.Render(g.Category), strings.Join(rows, "\n"), "")
	}
	return strings.Join(blocks, "\n")
}

func (m model) renderEducation(w int) string {
	lines := []string{""}
	entry := func(title, right, sub string) {
		left := m.st.label.Render(title)
		r := m.st.subtle.Render(right)
		if gap := w - lipgloss.Width(left) - lipgloss.Width(r); gap >= 2 {
			lines = append(lines, left+strings.Repeat(" ", gap)+r)
		} else {
			lines = append(lines, left, r)
		}
		lines = append(lines, m.st.subtle.Render(sub), "")
	}

	lines = append(lines, m.st.accent.Render("Education"), "")
	for _, e := range m.cv.Education {
		entry(e.Degree, e.Date, e.School+" · "+e.Location)
	}
	lines = append(lines, m.st.accent.Render("Courses & Certifications"), "")
	for _, c := range m.cv.Certifications {
		sub := c.Issuer
		if len(c.Items) > 0 {
			sub += " · " + strings.Join(c.Items, ", ")
		}
		entry(c.Name, c.Date, sub)
	}
	return strings.Join(lines, "\n")
}

func (m model) renderContact() string {
	c := m.cv.Contact
	row := func(label, value string) string {
		return m.st.subtle.Width(10).Render(label) + m.st.accent.Render(value)
	}
	return lipgloss.JoinVertical(lipgloss.Left,
		"",
		m.st.text.Render("Let's talk! The quickest way to reach me:"),
		"",
		row("Email", c.Email),
		row("LinkedIn", c.LinkedIn),
		row("GitHub", c.GitHub),
		"",
		m.st.subtle.Render("Thanks for stopping by. Press q to leave."),
	)
}
