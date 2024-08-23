Node JS-backend-production-with-Aashish

1. Overview
2. Node Js Project
3. Git & GitHub :  Git is a free and open source distributed version control system, GitHub is a code hosting platform for collaboration and version control

4. Husky :  Husky is an npm package that makes it easy to add Git hooks to your project. Git hooks are scripts that Git automatically executes before or after certain events, such as committing code or pushing changes to a repository
ie:  npm i husky lint-staged -D
     npx husky init

5. TypeScript :  Its a superset of javaScript, and will get type checking
ie:  npm i typescript -D
     npx tsc --init (To automatic genrate tsconfig.json)

6. Folder Structure :  Will be follow as a MVC pattern
7. Commit Lint : Using for git hook , to define proper sturcture for git commit to handle for commit , with the help for husky
ie:  npm i @commitlint/cli
 @commitlint/config-conventional -D
 
8. ES Lint : Find and fix problems in your JavaScript code
ie: npx eslint .
9. Prettier
10. Project Environment
11. Express JS
12. Global Error handling
13. 404 Hnadler
14. Logger : winston is designed to be a simple and universal logging library with support for multiple transports. A transport is essentially a storage device for your logs.

15. Source Map :  This module provides source map support for stack traces in node via the V8 stack trace API. It uses the source-map module to replace the paths and line numbers of source-mapped files with their original paths and line numbers.

16. ColorFul terminal : Easily set your terminal text color & styles
17. MongoDb
18. DataBase Log Storage
19. DataBase migration :  ts-migrate-mongoose is a migration framework for projects that are already using mongoose
ie:  npm run migrate:dev create first_name_last_name_to_name
     npm run migrate:dev up first_name_last_name_to_name
     npm run migrate:dev down first_name_last_name_to_name
     npm run migrate:dev list first_name_last_name_to_name
     npm run migrate:dev prune

20. Health Endpoint
21. Security - Helmet JS : Helmet helps secure Express apps by setting HTTP response headers.
ie: X-Powered-By: Info about the web server. Removed because it could be used in simple attacks

22. Security - CORS : CORS is a node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options
brower by default disAllow cross origin access

23. Security - rate limiting : rate-limiter-flexible counts and limits the number of actions by key and protects from DDoS and brute force attacks at any scale.

24. Dependecy Updates
25. Docker
