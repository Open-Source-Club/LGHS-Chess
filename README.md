# LGHS-Chess
LGHS Chess is a vote chess web app that allows two schools to play chess against each other. The entire student body is able to participate and vote on the moves individually. The move with the most votes at the end of the voting period is displayed on the website.


# How to Play
We have our LGHS Chess set up on https://lghsopensource.club, play it there!


# How to Set Up Your Own LGHS Chess
1. Clone the repo
2. You will need to modify the config.json file.
    * `production`
    * `OAuthID`: The google OAuth Client ID, [here's a guide to generate one](https://support.google.com/googleapi/answer/6158849?hl=en).
    * `domain`: The website domain.
    * `mongoUrl`: the URL for Mongo.
    * `reverseProxyEndpoint`: put '/' unless you have a reverse proxy.
    * `userWebhookUrl`, `schoolWebhookUrl`: webhook URLs if you would like to set up a discord webhook for when a user submits a move and when the school makes a move.
    * `schoolW.domain` / `schoolB.domain`: the email domain for the school. Only those with an email ending in this domain will be able to submit a move for their team.
    * `schoolW.roleID` / `schoolB.roleID`: The id of the role the discord webhook should ping.
3. run these docker commands:
```cd LGHS-Chess
docker container rm chess -f

docker build -t chess .
docker run -d -p 80:80 --name chess chess

docker image prune -f
