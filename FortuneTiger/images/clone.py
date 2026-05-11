import re
import requests
import numpy
import os
data = open(r"C:\xampp\htdocs\Fortune_Tiger-992018\data.json").read()
pattern = '(images/.*?)"'
files = re.findall(pattern, data)
files = numpy.array(files)

for file in files:
    url = "https://testing.tegahub.com/uploads/games/Fortune_Tiger-992018/" + file
    print("Downloading " + url)

    if not os.path.exists("../"+file):
        r = requests.get(url, allow_redirects=False)
        open(r'C:\xampp\htdocs\Fortune_Tiger-992018/' + file, 'wb').write(r.content)
