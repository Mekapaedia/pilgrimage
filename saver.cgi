#!/bin/bash

date >> saver.log
echo "......................." >> saver.log
env >> saver.log

if [ "$REQUEST_METHOD" = "POST" -a ! -z "$CONTENT_LENGTH" ]
then
	read -n $CONTENT_LENGTH QUERY_STRING_POST
	echo "$QUERY_STRING_POST" > save.json
	echo "Content-type: text/html"
	echo ""
	echo "saved"
else
	echo "Content-type: text/html"
	echo ""
	echo "hi"
fi

