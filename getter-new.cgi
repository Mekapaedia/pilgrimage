#!/bin/bash

echo "HTTP/1.1 200 OK"
if [ "$REQUEST_METHOD" = "GET" -a ! -z "$QUERY_STRING" ]
then
	touch save-new.json
	SIZE=$(du -b save-new.json | cut -f 1)
	echo "Content-Length: $SIZE"
	echo "Content-Type: text/html"
	echo ""
	cat save-new.json
fi
