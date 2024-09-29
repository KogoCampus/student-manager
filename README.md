# Welcome to your CDK TypeScript project

```
brew install aws-sam-cli  # For macOS users, or follow instructions for your OS.
```

if you experience below message during the local api testing  
```
Error: Running AWS SAM projects locally requires Docker. Have you got it installed and running?
```

Type
```
docker context inspect
```

and copy the value of `Endpoints.docker.Host` and enter this
```
export DOCKER_HOST=copied-docker-host
```


This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template
