# 產生社群分享預覽圖 assets/og.jpg（需 Windows 標楷體 kaiu.ttf 與 Pillow）
import random, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os; ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..").replace(os.sep,"/")+"/"
W,H=1200,630; random.seed(7)
img=Image.new("RGB",(W,H),(196,162,115))
# 紙紋雜訊
noise=Image.effect_noise((W,H),40).convert("L")
img=Image.composite(Image.new("RGB",(W,H),(150,115,72)),img,noise.point(lambda v: int(max(0,v-128)*0.5)))
fib=Image.effect_noise((W//8,H),60).convert("L").resize((W,H)).filter(ImageFilter.GaussianBlur(1))
img=Image.composite(Image.new("RGB",(W,H),(170,132,86)),img,fib.point(lambda v:int(max(0,v-140)*0.6)))
# 水墨遠山
def ridge(base,amp,alpha,seed):
    random.seed(seed); lay=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(lay)
    pts=[(0,H)]; ph=[random.random()*6 for _ in range(3)]
    for x in range(0,W+10,10):
        y=base+amp*(math.sin(x/170+ph[0])*.6+math.sin(x/70+ph[1])*.3+math.sin(x/29+ph[2])*.1)
        pts.append((x,y))
    pts.append((W,H)); d.polygon(pts,fill=(42,36,30,alpha))
    return lay.filter(ImageFilter.GaussianBlur(3))
base=img.convert("RGBA")
for b,a,al,s in [(430,60,40,1),(490,45,60,2),(560,30,90,3)]:
    base.alpha_composite(ridge(b,a,al,s))
# 宣紙卡
card=Image.new("RGBA",(W,H),(0,0,0,0)); cd=ImageDraw.Draw(card)
cd.rounded_rectangle((70,70,1130,430),8,fill=(247,240,225,240))
sh=Image.new("RGBA",(W,H),(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle((76,82,1136,442),8,fill=(60,40,15,110))
base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10))); base.alpha_composite(card)
logo=Image.open(ROOT+"assets/logo-512.png").resize((170,167))
base.alpha_composite(logo,(115,165))
d=ImageDraw.Draw(base)
kai="C:/Windows/Fonts/kaiu.ttf"
f1=ImageFont.truetype(kai,40); f2=ImageFont.truetype(kai,96); f3=ImageFont.truetype(kai,40); fs=ImageFont.truetype(kai,40)
d.text((320,140),"桃園市龍潭區石門國民小學",font=f1,fill=(74,64,54))
d.text((316,200),"競賽榮譽榜",font=f2,fill=(42,36,30))
d.rectangle((320,330,326,375),fill=(176,58,46))
d.text((340,330),"115 學年度校內語文競賽 成績公告",font=f3,fill=(143,42,32))
# 印章
seal=Image.new("RGBA",(150,150),(0,0,0,0)); sd=ImageDraw.Draw(seal)
sd.rounded_rectangle((5,5,145,145),10,outline=(176,58,46,235),width=6)
for i,(ch,x,y) in enumerate([("石",80,22),("門",80,78),("榮",28,22),("譽",28,78)]):
    sd.text((x,y),ch,font=fs,fill=(176,58,46,235))
seal=seal.rotate(-6,resample=Image.BICUBIC,expand=True)
base.alpha_composite(seal,(960,110))
base.convert("RGB").save(ROOT+"assets/og.jpg",quality=86,optimize=True)
