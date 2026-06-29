import re

file_path = r"c:\Users\shset\OneDrive\Desktop\MyProjects\ACM-Website\ACM-Website-26\src\components\sections\TeamSection.module.css"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def repl(m):
    tail = m.group(1)
    return f".viewfinderCard:hover{tail}, .viewfinderCard.cardFocused{tail}"

# Match .viewfinderCard:hover followed by anything except , or { up to a , or {
new_content = re.sub(r'\.viewfinderCard:hover([^,{]*?)(?=\s*[,{])', repl, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("CSS updated successfully!")
