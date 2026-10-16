"""Import the first (desktop) official hierarchy; never count duplicated mobile/A–Z markup."""
from html.parser import HTMLParser
from pathlib import Path
import json, hashlib

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://www.tsinghua.edu.cn/yxsz.htm'
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.root = {'tag': 'root', 'attrs': {}, 'children': []}; self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        node = {'tag': tag, 'attrs': dict(attrs), 'children': []}
        self.stack[-1]['children'].append(node)
        if tag not in ['meta', 'link', 'img', 'input', 'br', 'hr', 'source', 'wbr', 'area', 'base', 'embed']: self.stack.append(node)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i]['tag'] == tag: self.stack = self.stack[:i]; break
    def handle_data(self, data): self.stack[-1]['children'].append(data)
def walk(node):
    if isinstance(node, str): return
    yield node
    for child in node['children']: yield from walk(child)
def text(node): return node if isinstance(node, str) else ''.join(text(child) for child in node['children'])

THEMES = {
    'architecture': '建筑学院 土木水利学院 环境学院',
    'engineering': '机械工程学院 航天航空学院 材料学院 化学工程系 核能与新能源技术研究院 安全科学学院 航空发动机研究院 低碳能源实验室 碳中和研究院 国家卓越工程师学院',
    'information': '信息科学技术学院 人工智能学院 电机工程与应用电子技术系 交叉信息研究院 未来实验室 智能产业研究院 全球创新学院',
    'science': '理学院 工程物理系 统计与数据科学系 数学科学中心 数学基础教学中心',
    'health': '心理与认知科学系 生命科学学院 医学院（TM） 万科公共卫生与健康学院 生物医学交叉研究院',
    'humanities': '人文学院 外国语言文学系 社会科学学院 国际与地区研究院 马克思主义学院 出土文献研究与保护中心',
    'society': '经济管理学院 公共管理学院 法学院 新闻与传播学院 五道口金融学院',
    'arts': '美术学院 教育学院 体育部 艺术教育中心',
    'colleges': '深圳国际研究生院 苏世民书院 新雅书院 致理书院 日新书院 未央书院 探微书院 行健书院 求真书院 为先书院 秀钟书院 笃实书院 至善书院 无穹书院 紫荆书院 自强书院 水木书院',
}
ALIASES = {'机械工程系':['机械系'], '精密仪器系':['精仪系'], '能源与动力工程系':['能动系','热能系'], '车辆与运载学院':['车辆学院','汽车系'], '工业工程系':['工业系'], '基础工业训练中心':['工训','iCenter'], '计算机科学与技术系':['计算机系','CS'], '电子工程系':['电子系'], '电机工程与应用电子技术系':['电机系'], '经济管理学院':['经管学院'], '五道口金融学院':['五道口'], '美术学院':['清华美院'], '深圳国际研究生院':['深圳','SIGS'], '临床医学院（北京清华长庚医院）':['长庚医院'], '交叉信息研究院':['交叉信息','姚班']}
SAMPLE = {'机械工程系':'mechanical','精密仪器系':'precision','能源与动力工程系':'energy','车辆与运载学院':'vehicle','工业工程系':'industrial','基础工业训练中心':'icenter'}
SUBPAGES = {
    '建筑系':('https://www.arch.tsinghua.edu.cn/column/jzx','https://www.arch.tsinghua.edu.cn/'),
    '城市规划系':('https://www.arch.tsinghua.edu.cn/column/csghx','https://www.arch.tsinghua.edu.cn/'),
    '建筑技术科学系':('https://www.arch.tsinghua.edu.cn/column/jzjskxx','https://www.arch.tsinghua.edu.cn/'),
    '景观学系':('https://www.arch.tsinghua.edu.cn/column/jgxx','https://www.arch.tsinghua.edu.cn/'),
    '工程力学系':('https://www.hy.tsinghua.edu.cn/jgsz/gclxx/gtlxyjs.htm','https://www.hy.tsinghua.edu.cn/'),
    '航空宇航工程系':('https://www.hy.tsinghua.edu.cn/jgsz/hkyhgcx/gcdlxyjs.htm','https://www.hy.tsinghua.edu.cn/'),
}

def main():
    snapshot = ROOT / 'reference/tsinghua-directory-2026-10-14.html'
    parser = Parser(); parser.feed(snapshot.read_text())
    area = next(n for n in walk(parser.root) if 'yxszCon' in n['attrs'].get('class','').split())
    records = []; parent = None
    for node in walk(area):
        if node['tag'] not in ['h4','li']: continue
        name = ' '.join(text(node).replace('*','').split())
        link = next((n['attrs'].get('href','') for n in walk(node) if n['tag']=='a'), '')
        is_child = node['tag'] == 'li'
        root_name = parent['name'] if is_child else name
        theme = next(key for key, names in THEMES.items() if root_name in names.split())
        record = {
            'id': 'u-' + hashlib.sha256(name.encode()).hexdigest()[:10], 'name': name,
            'parentId': parent['id'] if is_child else None, 'parentName': parent['name'] if is_child else None,
            'theme': theme, 'aliases': ALIASES.get(name,[]),
            'url': link or (parent['url'] if is_child else SOURCE),
            'linkKind': 'direct' if link else ('parent' if is_child else 'directory'),
            'sourceUrl': SOURCE, 'sourceHref': link or None, 'verifiedAt': '2026-10-14',
            'art': SAMPLE.get(name), 'artStatus': 'sample' if name in SAMPLE else 'planned',
        }
        if not link and name in SUBPAGES:
            record.update(url=SUBPAGES[name][0],linkKind='department-page',linkSource=SUBPAGES[name][1])
        records.append(record)
        if not is_child: parent = record
    assert len(records) == 125, f'Official snapshot changed: {len(records)}; review required'
    assert len({r['name'] for r in records}) == 125
    (ROOT/'src/data/units.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    print(f'Imported {len(records)} units, {sum(r["name"].endswith("书院") for r in records)} colleges; {sum(r["linkKind"] in ["parent","directory"] for r in records)} explicit fallbacks.')
if __name__ == '__main__': main()
