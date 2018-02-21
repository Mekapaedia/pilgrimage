#!/bin/bash

date >> saver-new.log
echo "......................." >> saver.log
env >> saver-new.log

if [ "$REQUEST_METHOD" = "POST" -a ! -z "$CONTENT_LENGTH" ]
then
	read -n $CONTENT_LENGTH QUERY_STRING_POST
	echo "$QUERY_STRING_POST" > save-new.json
	echo "Content-type: text/html"
	echo "Access-Control-Allow-Origin: *"
	echo ""
	echo "saved"
else
	echo "Content-type: text/html"
	echo ""
	echo "hi"
fi

