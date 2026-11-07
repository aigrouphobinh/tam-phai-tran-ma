"""Original offline sound-design generator; deterministic audio, no licensed samples."""
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io.wavfile import write
ROOT=Path(__file__).parent/'public/assets/audio';ROOT.mkdir(parents=True,exist_ok=True)
SR=24000
rng=np.random.default_rng(20261107)

def env(n,att=.01,dec=.24):
 t=np.arange(n)/SR
 return (1-np.exp(-t/max(.001,att)))*np.exp(-t/max(.01,dec))
def tone(n, f0=440, f1=440, harmonics=(1,), phases=None):
 t=np.arange(n)/SR
 phase=2*np.pi*(f0*t+(f1-f0)*t*t/(2*max(n/SR,.00001)))
 y=np.zeros(n,dtype=np.float64)
 for k in harmonics:y+=np.sin(phase*k+(.12*k))/k**1.2
 return y

def noise(n, low=100, high=6500):
 a=rng.standard_normal(n)
 sos=butter(2,[max(15,low),min(SR/2-300,high)],btype='bandpass',fs=SR,output='sos')
 return sosfilt(sos,a)
def save(name,samples):
 samples=np.asarray(samples,dtype=float);samples=samples/(max(1,np.max(np.abs(samples))*1.15))
 # tiny stereo spatial dimension, one channel slightly delayed
 left=samples;right=np.r_[np.zeros(27),samples[:-27]]*.94
 pcm=np.int16(np.clip(np.column_stack([left,right]),-1,1)*32767)
 write(ROOT/(name+'.wav'),SR,pcm)

def sound(name,dur,components):
 n=int(SR*dur);a=np.zeros(n)
 for offset,y,vol in components:
  st=int(offset*SR);ct=min(len(y),n-st)
  if ct>0:a[st:st+ct]+=vol*y[:ct]
 save(name,a)

def swish():
 n=int(.5*SR);t=np.arange(n)/SR
 x=noise(n,330,6200)*env(n,.055,.13)
 x+=tone(n,1040,95,(1,2,3))*env(n,.003,.09)*.29
 return x
sound('sword_whoosh',.56,[(0,swish(),1)])
sound('sword_impact',.55,[(0,noise(int(.45*SR),170,4500)*env(int(.45*SR),.002,.12),.9),(.008,tone(int(.52*SR),180,55,(1,2,3))*env(int(.52*SR),.002,.12),.85)])
sound('sword_rain',1.8,[(j*.12,swish(),.7) for j in range(9)])

n=int(1.4*SR)
sound('lightning',1.4,[(0,noise(n,280,10500)*env(n,.001,.29),.8),(.03,tone(n,270,45,(1,2,4,7))*env(n,.001,.39),.8),(.17,noise(int(.9*SR),70,2000)*env(int(.9*SR),.002,.24),.35)])
n=int(.85*SR)
sound('magic_seal',.85,[(0,tone(n,320,890,(1,1.5,2.5))*env(n,.08,.5),.7),(.18,noise(int(.58*SR),800,9000)*env(int(.58*SR),.13,.19),.28)])
n=int(.9*SR)
sound('heal_lotus',.9,[(0,tone(n,523,660,(1,2,3))*env(n,.022,.55),.5),(.16,tone(int(.7*SR),784,1174,(1,2))*env(int(.7*SR),.04,.35),.38)])
n=int(.7*SR)
sound('shield_bloom',.7,[(0,tone(n,180,620,(1,2,4))*env(n,.015,.37),.8),(.08,noise(n,700,7700)*env(n,.03,.2),.2)])
n=int(.9*SR)
sound('shield_break',.9,[(0,noise(n,100,10500)*env(n,.001,.22),1),(.02,tone(n,160,31,(1,2,4))*env(n,.001,.31),.85)])
n=int(1.8*SR);t=np.arange(n)/SR
raw=tone(n,68,34,(1,2,3,5,7))*env(n,.12,.76)
raw+=noise(n,60,1600)*env(n,.16,.67)*.18
sound('dragon_roar',1.8,[(0,raw,1),(.82,tone(int(.9*SR),108,47,(1,2,3))*env(int(.9*SR),.03,.28),.45)])
n=int(.75*SR)
sound('warning',.75,[(0,tone(n,550,390,(1,2,3))*env(n,.002,.18),.8),(.3,tone(int(.44*SR),550,330,(1,2,3))*env(int(.44*SR),.002,.14),.7)])
n=int(1.1*SR)
sound('boss_cast',1.1,[(0,tone(n,160,46,(1,2,3,4))*env(n,.05,.5),.9),(.2,noise(int(.88*SR),120,3000)*env(int(.88*SR),.12,.22),.4)])
n=int(.9*SR)
sound('boss_impact',.9,[(0,tone(n,96,28,(1,2,3,5))*env(n,.003,.34),1),(.02,noise(n,38,4800)*env(n,.002,.16),.9)])
n=int(1.7*SR)
sound('revive',1.7,[(0,tone(n,262,523,(1,2,3))*env(n,.2,1.1),.58),(.37,tone(int(1.27*SR),392,1047,(1,2))*env(int(1.27*SR),.08,.74),.55)])

n=int(3.8*SR)
sound('victory',3.8,[(0,tone(n,262,262,(1,2,3))*env(n,.03,.8),.5),(.3,tone(int(3.5*SR),330,330,(1,2,3))*env(int(3.5*SR),.05,.85),.45),(.62,tone(int(3.16*SR),392,392,(1,2,3))*env(int(3.16*SR),.08,1.25),.46),(1.1,tone(int(2.68*SR),523,523,(1,2,3))*env(int(2.68*SR),.03,1.4),.55)])

# Seamless 16s ambience bed: sustained fifth, low-frequency rumble, wind and temple chimes.
n=int(16*SR);t=np.arange(n)/SR
am=.38*np.sin(2*np.pi*55*t)+.16*np.sin(2*np.pi*82.4*t)+.10*np.sin(2*np.pi*164.8*t)
am=(am*(.72+.1*np.sin(t*2*np.pi/8))+.09*noise(n,55,900))*.55
for j,at in enumerate((2,5.5,9,13)):
 dur=int(2.0*SR);st=int(at*SR)
 am[st:st+dur]+=.14*tone(dur,[523.25,392,659.25,587.33][j],[523.25,392,659.25,587.33][j],(1,2,3,4))*env(dur,.005,.6)
# Cross-fade ending with beginning.
w=int(.5*SR);a=am.copy();a[-w:]=am[-w:]*(1-np.linspace(0,1,w))+am[:w]*np.linspace(0,1,w)
save('temple_ambience',a)
print('Generated',len(list(ROOT.glob('*.wav'))),'original sound effects; bytes:',sum(p.stat().st_size for p in ROOT.glob('*.wav')))
