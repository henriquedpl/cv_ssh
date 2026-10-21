# Records demo.gif of the CV over SSH.
# Run from the repo root with: vhs demo.tape

Output demo.gif

Require ssh

Set Shell "bash"
Set FontSize 16
Set Width 1200
Set Height 720
Set Padding 20
Set Theme "TokyoNight"
Set TypingSpeed 60ms

# Build and start the server off-camera.
Hide
Type "go build -o cv_ssh . && (./cv_ssh >/dev/null 2>&1 &) && sleep 1"
Enter
# Skip host-key prompts for the throwaway local server.
Type `ssh() { command ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR "$@"; }; clear`
Enter
Sleep 3s
Show

Type "ssh -p 23234 localhost"
Sleep 500ms
Enter
Sleep 2s

# About
Sleep 2s

# Experience: walk through a few roles
Tab
Sleep 1s
Down@700ms 3
Sleep 1s

# Projects
Tab
Sleep 1s
Down@700ms 1
Sleep 1s

# Skills, Education, Contact
Tab
Sleep 1.5s
Tab
Sleep 1.5s
Tab
Sleep 2s

# Back to About via number key
Type "1"
Sleep 1.5s

Type "q"
Sleep 500ms

# Stop the server off-camera.
Hide
Type "pkill -f '^./cv_ssh$'"
Enter
