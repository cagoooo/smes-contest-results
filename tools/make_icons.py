# 產生 favicon.ico 與 assets/icon-*.png（需 Windows 標楷體 kaiu.ttf 與 Pillow）
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os; OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..").replace(os.sep,"/")+"/"
KAI="C:/Windows/Fonts/kaiu.ttf"
RED=(176,58,46); PAPER=(247,240,225)
def make(size, maskable=False):
    S=1024
    im=Image.new("RGBA",(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    if maskable:
        d.rectangle((0,0,S,S),fill=RED+(255,)); inset=200
    else:
        d.rounded_rectangle((24,24,S-24,S-24),radius=200,fill=RED+(255,)); inset=110
    # 內框（印章感）
    d.rounded_rectangle((inset,inset,S-inset,S-inset),radius=90 if not maskable else 60,outline=PAPER+(255,),width=34 if size>=128 else 0)
    f=ImageFont.truetype(KAI, 700 if not maskable else 560)
    ch="榮"
    bb=d.textbbox((0,0),ch,font=f)
    w,h=bb[2]-bb[0],bb[3]-bb[1]
    d.text(((S-w)/2-bb[0],(S-h)/2-bb[1]+10),ch,font=f,fill=PAPER+(255,))
    # 小尺寸加粗：疊描邊
    if size<64:
        d.text(((S-w)/2-bb[0],(S-h)/2-bb[1]+10),ch,font=f,fill=PAPER+(255,),stroke_width=22,stroke_fill=PAPER+(255,))
    return im.resize((size,size),Image.LANCZOS)
make(512).save(OUT+"assets/icon-512.png",optimize=True)
make(192).save(OUT+"assets/icon-192.png",optimize=True)
make(512,True).save(OUT+"assets/icon-maskable-512.png",optimize=True)
# apple-touch 不吃透明：鋪牛皮紙底
a=Image.new("RGBA",(180,180),(196,162,115,255)); a.alpha_composite(make(180,True)); a.convert("RGB").save(OUT+"assets/apple-touch-icon.png",optimize=True)
make(32).save(OUT+"assets/favicon-32.png",optimize=True)
icos=[make(s) for s in (16,32,48)]
icos[2].save(OUT+"favicon.ico",sizes=[(16,16),(32,32),(48,48)],append_images=icos[:2])
prev=Image.new("RGBA",(420,140),(196,162,115,255))
for i,s in enumerate((16,32,48,96)):
    prev.alpha_composite(make(s),(20+i*100,(140-s)//2))
prev.save(OUT+"tools/icon_preview.png")
print("ok")
