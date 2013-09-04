cookie=`curl -d "username=aaronf" -d "password=foobar" "http://192.168.1.101:8124/login" -D - -s | grep Cookie | cut -d" " -f 2`
curl -d "url=$1" -d "parse=true" "http://192.168.1.101:8124/api/v1/link/add" -H "Cookie: $cookie" -D - -s
#curl -d "url=$1" -X DELETE "http://192.168.1.101:8124/api/v1/link/delete/$1" -H "Cookie: $cookie" -D - -s

#curl -d "$2" -X POST "http://192.168.1.101:8124/api/v1/link/edit/$1" -H "Cookie: $cookie" -D - -s
