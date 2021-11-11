# Yet another discord bot for axie infinity

## Usage

Here are some example snippets to help you get started creating a container.

### docker-compose (recommended, [click here for more info](https://docs.linuxserver.io/general/docker-compose))

```yaml
---
version: "2.1"
services:
  wireguard:
    image: ghcr.io/m1chaeldg/yet-another-axie-discordbot:main
    container_name: yaadb
    environment:
      - DISCORD_BOT_TOKEN="discord token"
      - GOOGLE_EMAIL="gmail here"
      - GOOGLE_PRIVATE_KEY="foo"
      - ISKO_SPREADSHEET_ID=food
    restart: always
```

### docker cli ([click here for more info](https://docs.docker.com/engine/reference/commandline/cli/))

```bash
docker run -d \
  --name=yaadb \
  -e DISCORD_BOT_TOKEN="discord token" \
  -e GOOGLE_EMAIL="gmail here" \
  -e GOOGLE_PRIVATE_KEY="foo" \
  -e ISKO_SPREADSHEET_ID=food \
  --restart always \
  ghcr.io/m1chaeldg/yet-another-axie-discordbot:main
```
