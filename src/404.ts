import { createTemplate } from "./lib";

type MissingError = {
	name: string;
	code: number;
	message: string;
}

const template = createTemplate`<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${"code"} - ${"message"}</title>
    <style>
        body {
            font-family: sans-serif;
            text-align: center;
            padding: 20px;
        }
        .error {
            margin: 20px;
        }
    </style>
</head>
<body>
    <div class="error">
        <h1>${"code"}</h1>
        <p>${"name"}</p>
        <p>${"message"}</p>
    </div>
</body>
</html>`;

export function errorPage(e: MissingError): string {
	return template({
		"code": e.code.toString(),
		"name": e.name,
		"message": e.message
	});
}
