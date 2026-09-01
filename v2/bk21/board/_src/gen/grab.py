# -*- coding: utf-8 -*-
# 하는 일: 보드 HTML 안에 박힌 const 데이터를 꺼낸다
import json, sys, re
def grab(path):
    s = open(path, encoding='utf-8').read()
    outer = json.loads(s)                      # {"result": "...text..."}
    txt = outer['result']
    i = txt.find('[{'); j = txt.rfind('}]')
    rows = json.loads(txt[i:j+2])
    return rows[0]['data']
if __name__ == '__main__':
    d = grab(sys.argv[1])
    with open(sys.argv[2], 'a', encoding='utf-8') as f:
        f.write(d + "\n")
    print(f"  +{len(d.splitlines())}행")
