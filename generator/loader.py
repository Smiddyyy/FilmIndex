import requests
import time

url = "http://localhost:3000/fetch-new-movie"
with open("movies", "r") as file:
    for line in file.readlines():
        movie = line.strip()
        querystring = {"title":movie}
        response = requests.post(url, params=querystring)
        print(f"{response.status_code}: {movie}")
        time.sleep(1)




