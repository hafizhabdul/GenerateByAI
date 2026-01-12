# Claude Code Notification Script for Windows
param(
    [string]$Title = "Claude Code",
    [string]$Message = "Notification"
)

Add-Type -AssemblyName System.Windows.Forms

# Create notification icon
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Information
$notifyIcon.BalloonTipTitle = $Title
$notifyIcon.BalloonTipText = $Message
$notifyIcon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
$notifyIcon.Visible = $true

# Show balloon notification
$notifyIcon.ShowBalloonTip(5000)

# Wait a bit then clean up
Start-Sleep -Seconds 6
$notifyIcon.Dispose()
