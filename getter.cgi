#!/bin/bash

if [ "$REQUEST_METHOD" = "GET" -a ! -z "$QUERY_STRING" ]
then
	touch save.json
	echo "Content-type: text/html"
	echo ""
	cat save.json
fi
