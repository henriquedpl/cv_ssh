# cv_ssh

My CV, served as a terminal app over SSH. No browser, no PDF: just `ssh` in and browse.

![Demo](demo.gif)

Built with [Wish](https://github.com/charmbracelet/wish), [Bubble Tea](https://github.com/charmbracelet/bubbletea) and [Lip Gloss](https://github.com/charmbracelet/lipgloss), using a Tokyo Night color scheme that adapts to light and dark terminals.

## Try it locally

Requires Go 1.27+.

```sh
go build -o cv_ssh .
./cv_ssh
```

Then, in another terminal:

```sh
ssh -p 23234 localhost
```

On first start the server generates a host key at `.ssh/id_ed25519` (git-ignored).

## Navigation

| Key | Action |
|---|---|
| `tab` / `→` / `l` | Next tab |
| `shift+tab` / `←` / `h` | Previous tab |
| `1`–`6` | Jump to tab |
| `↑` `↓` / `k` `j` | Move through entries |
| `g` / `G` | First / last entry |
| `q` / `esc` | Quit |

## Configuration

| Variable | Default | Description |
|---|---|---|
| `CV_HOST` | `0.0.0.0` | Address to listen on |
| `CV_PORT` | `23234` | Port to listen on |
| `CV_HOST_KEY` | `.ssh/id_ed25519` | Path to the server's host key |

## Editing the CV

All content lives in [`cv.yaml`](cv.yaml): summary, experience, projects, skills, education, certifications and contact details. It is embedded into the binary at build time, so rebuild after editing.

## Recording the demo

The GIF above is generated with [VHS](https://github.com/charmbracelet/vhs) from [`demo.tape`](demo.tape), which builds and starts the server, connects over SSH, tours the tabs and shuts down:

```sh
vhs demo.tape
```

## Project layout

```
main.go    SSH server setup and middleware
cv.go      cv.yaml schema and loading
model.go   Bubble Tea model: tabs, layout and styles
cv.yaml    CV content
demo.tape  VHS script that records demo.gif
```
