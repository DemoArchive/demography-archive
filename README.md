# 人口档案馆 · Demography Archive

一个关于中国人口的数据可视化网站：出生人口、生育率、未来人口预测、各省地图、各方观点与思想实验。

纯静态站点，无框架、无构建步骤，克隆后用任意静态文件服务器打开即可。

## 页面

| 页面 | 路径 | 内容 |
| --- | --- | --- |
| 首页 | `/` | 入口与各章节导航 |
| 数据中心 | `/datacenter/` | 全国历年出生人口、未来预测、各省数据，附 xlsx 下载 |
| 各省生育地图 | `/map/` | 2016~2025 各省出生人口降幅排序；1949~2025 分省出生人口与出生率地图 |
| 各国生育率与生育支持 | `/world/` | 世界生育率地图（1960~2024）与 OECD 家庭福利支出排名及走势 |
| 未来人口预测 | `/forecast/` | 2026~2100 总人口、出生、死亡、年减少人数的高/中/低情景 |
| 正在来临的危险 | `/harms/` | 人口收缩对经济与社会的影响 |
| 永恒的争论 | `/debates/` | 关于人口的常见争论与回应 |
| 思想实验 | `/thought-experiment/` | 《少子化的囚徒困境》《博士与母亲》《2060 年的五百万》 |
| 各方观点 | `/viewpoints/` | 六位人物关于人口问题的公开表述，共 74 条，附出处 |
| 其他 | `/other/` | 人口概念解释、关于本站、数据来源与联系方式 |

`/decline/`、`/spending/`、`/glossary/`、`/about/` 为旧地址跳转页。

## 技术

- 原生 HTML / CSS / JavaScript，无框架、无构建步骤
- 图表使用 [ECharts](https://echarts.apache.org/)（Apache-2.0）
- 全站导航由 `nav.js` + `nav.css` 注入
- 数据以 JS 常量与 `data/` 下的 xlsx 文件提供

## 本地预览

不要直接双击 `index.html`，用静态服务器：

```bash
python -m http.server 8000
```

然后访问 <http://localhost:8000>。

## 目录结构

```
index.html            首页
nav.js / nav.css      全站导航
datacenter/           数据中心
map/                  各省生育地图
world/                各国生育率与生育支持
forecast/             未来人口预测
harms/ debates/       危险与争论
thought-experiment/   思想实验
viewpoints/           各方观点
other/                概念解释与关于本站
data/                 xlsx 原始数据
images/               图片与头像
```

## 数据来源

- 国家统计局：全国及各省历年出生人口、人口普查
- 育娲人口智库：出生人口回溯
- 世界银行 World Development Indicators：各国生育率
- OECD：家庭福利公共支出
- 联合国《世界人口展望 2024》：预测所用年龄别生育率与生命表

具体口径与注释见各页面底部说明及 `data/` 内文件。

## 许可

- **代码**（HTML / CSS / JavaScript）：MIT，见 [LICENSE](LICENSE)
- **文字、图表与页面设计**：© 2026 人口档案馆，未经许可请勿转载
- **第三方数据**：版权归原始来源所有，使用请遵循各来源条款
- **第三方库**：ECharts（Apache-2.0）；地图边界数据来自 DataV / 高德，遵循原服务条款

## 说明

未来人口预测为模型结果，仅供参考。欢迎通过 Issue 或 PR 指出数据、文字或代码问题。
