/*
时域转频域，快速傅里叶变换(FFT)
https://github.com/xiangyuecn/Recorder

相对于Recorder.LibFFT(extensions/lib.fft.js)，此版本计算更准确些

var fft=Recorder.LibFFT_Exact(bufferSize)
	bufferSize取值2的n次方

fft.bufferSize 实际采用的bufferSize
fft.transform(inBuffer) 计算得到频域值
	inBuffer:[Int16,...] 数组长度必须是bufferSize
	返回[Float64(Long),...]，长度为bufferSize/2
		LibFFT 得到的是模的平方，用Math.sqrt(v)*2转一下就和这个的差不多

fft.toDBFS(outBuffer) 计算音量，单位dBFS（满刻度相对电平）
	outBuffer:[Float64,...] transform返回的结果
	返回[-100~0,...] （最大值0dB，最小值-100代替-∞）
*/
Recorder.LibFFT_Exact=function(bufferSize){
"use strict";

/*
indutny/fft.js (MIT License) 
https://github.com/indutny/fft.js/blob/4a18cf88fcdbd4ad5acca6eaea06a0b462047835/lib/fft.js
*/
function FFT(size) {
	this.size = size | 0;
	if (this.size <= 1 || (this.size & (this.size - 1)) !== 0)
		throw new Error('FFT size must be a power of two and bigger than 1');

	this._csize = size << 1;

	// NOTE: Use of `var` is intentional for old V8 versions
	var table = new Array(this.size * 2);
	for (var i = 0; i < table.length; i += 2) {
		var angle = Math.PI * i / this.size;
		table[i] = Math.cos(angle);
		table[i + 1] = -Math.sin(angle);
	}
	this.table = table;

	// Find size's power of two
	var power = 0;
	for (var t = 1; this.size > t; t <<= 1)
		power++;

	// Calculate initial step's width:
	//   * If we are full radix-4 - it is 2x smaller to give inital len=8
	//   * Otherwise it is the same as `power` to give len=4
	this._width = power % 2 === 0 ? power - 1 : power;

	// Pre-compute bit-reversal patterns
	this._bitrev = new Array(1 << this._width);
	for (var j = 0; j < this._bitrev.length; j++) {
		this._bitrev[j] = 0;
		for (var shift = 0; shift < this._width; shift += 2) {
			var revShift = this._width - shift - 2;
			this._bitrev[j] |= ((j >>> shift) & 3) << revShift;
		}
	}

	this._out = null;
	this._data = null;
	this._inv = 0;
}

FFT.prototype.realTransform = function(out, data) {
	if (out === data)
		throw new Error('Input and output buffers must be different');

	this._out = out;
	this._data = data;
	this._inv = 0;
	this._realTransform4();
	this._out = null;
	this._data = null;
};

// Real input radix-4 implementation
FFT.prototype._realTransform4 = function() {
	var out = this._out;
	var size = this._csize;

	// Initial step (permute and transform)
	var width = this._width;
	var step = 1 << width;
	var len = (size / step) << 1;

	var outOff;
	var t;
	var bitrev = this._bitrev;
	if (len === 4) {
		for (outOff = 0, t = 0; outOff < size; outOff += len, t++) {
			var off = bitrev[t];
			this._singleRealTransform2(outOff, off >>> 1, step >>> 1);
		}
	} else {
		// len === 8
		for (outOff = 0, t = 0; outOff < size; outOff += len, t++) {
			var off = bitrev[t];
			this._singleRealTransform4(outOff, off >>> 1, step >>> 1);
		}
	}

	// Loop through steps in decreasing order
	var inv = this._inv ? -1 : 1;
	var table = this.table;
	for (step >>= 2; step >= 2; step >>= 2) {
		len = (size / step) << 1;
		var halfLen = len >>> 1;
		var quarterLen = halfLen >>> 1;
		var hquarterLen = quarterLen >>> 1;

		// Loop through offsets in the data
		for (outOff = 0; outOff < size; outOff += len) {
			for (var i = 0, k = 0; i <= hquarterLen; i += 2, k += step) {
				var A = outOff + i;
				var B = A + quarterLen;
				var C = B + quarterLen;
				var D = C + quarterLen;

				// Original values
				var Ar = out[A];
				var Ai = out[A + 1];
				var Br = out[B];
				var Bi = out[B + 1];
				var Cr = out[C];
				var Ci = out[C + 1];
				var Dr = out[D];
				var Di = out[D + 1];

				// Middle values
				var MAr = Ar;
				var MAi = Ai;

				var tableBr = table[k];
				var tableBi = inv * table[k + 1];
				var MBr = Br * tableBr - Bi * tableBi;
				var MBi = Br * tableBi + Bi * tableBr;

				var tableCr = table[2 * k];
				var tableCi = inv * table[2 * k + 1];
				var MCr = Cr * tableCr - Ci * tableCi;
				var MCi = Cr * tableCi + Ci * tableCr;

				var tableDr = table[3 * k];
				var tableDi = inv * table[3 * k + 1];
				var MDr = Dr * tableDr - Di * tableDi;
				var MDi = Dr * tableDi + Di * tableDr;

				// Pre-Final values
				var T0r = MAr + MCr;
				var T0i = MAi + MCi;
				var T1r = MAr - MCr;
				var T1i = MAi - MCi;
				var T2r = MBr + MDr;
				var T2i = MBi + MDi;
				var T3r = inv * (MBr - MDr);
				var T3i = inv * (MBi - MDi);

				// Final values
				var FAr = T0r + T2r;
				var FAi = T0i + T2i;

				var FBr = T1r + T3i;
				var FBi = T1i - T3r;

				out[A] = FAr;
				out[A + 1] = FAi;
				out[B] = FBr;
				out[B + 1] = FBi;

				// Output final middle point
				if (i === 0) {
					var FCr = T0r - T2r;
					var FCi = T0i - T2i;
					out[C] = FCr;
					out[C + 1] = FCi;
					continue;
				}

				// Do not overwrite ourselves
				if (i === hquarterLen)
					continue;

				// In the flipped case:
				// MAi = -MAi
				// MBr=-MBi, MBi=-MBr
				// MCr=-MCr
				// MDr=MDi, MDi=MDr
				var ST0r = T1r;
				var ST0i = -T1i;
				var ST1r = T0r;
				var ST1i = -T0i;
				var ST2r = -inv * T3i;
				var ST2i = -inv * T3r;
				var ST3r = -inv * T2i;
				var ST3i = -inv * T2r;

				var SFAr = ST0r + ST2r;
				var SFAi = ST0i + ST2i;

				var SFBr = ST1r + ST3i;
				var SFBi = ST1i - ST3r;

				var SA = outOff + quarterLen - i;
				var SB = outOff + halfLen - i;

				out[SA] = SFAr;
				out[SA + 1] = SFAi;
				out[SB] = SFBr;
				out[SB + 1] = SFBi;
			}
		}
	}
};

// radix-2 implementation
//
// NOTE: Only called for len=4
FFT.prototype._singleRealTransform2 = function(outOff, off, step) {
	var out = this._out;
	var data = this._data;

	var evenR = data[off];
	var oddR = data[off + step];

	var leftR = evenR + oddR;
	var rightR = evenR - oddR;

	out[outOff] = leftR;
	out[outOff + 1] = 0;
	out[outOff + 2] = rightR;
	out[outOff + 3] = 0;
};

// radix-4
//
// NOTE: Only called for len=8
FFT.prototype._singleRealTransform4 = function(outOff, off, step) {
	var out = this._out;
	var data = this._data;
	var inv = this._inv ? -1 : 1;
	var step2 = step * 2;
	var step3 = step * 3;

	// Original values
	var Ar = data[off];
	var Br = data[off + step];
	var Cr = data[off + step2];
	var Dr = data[off + step3];

	// Pre-Final values
	var T0r = Ar + Cr;
	var T1r = Ar - Cr;
	var T2r = Br + Dr;
	var T3r = inv * (Br - Dr);

	// Final values
	var FAr = T0r + T2r;

	var FBr = T1r;
	var FBi = -T3r;

	var FCr = T0r - T2r;

	var FDr = T1r;
	var FDi = T3r;

	out[outOff] = FAr;
	out[outOff + 1] = 0;
	out[outOff + 2] = FBr;
	out[outOff + 3] = FBi;
	out[outOff + 4] = FCr;
	out[outOff + 5] = 0;
	out[outOff + 6] = FDr;
	out[outOff + 7] = FDi;
};


//**封装调用**
var FFT_N_LOG=Math.round(Math.log(bufferSize)/Math.log(2));
var FFT_N = 1 << FFT_N_LOG;

var fft=new FFT(FFT_N);
var fftOut=new Float64Array(FFT_N*2);

var getModulus=function(inBuffer){
	fft.realTransform(fftOut, inBuffer);
	var L=FFT_N/2, outBuffer=new Float64Array(L);
	for(var i=0,j=0;i<L;i++,j+=2){
		//fftOut: 使用左侧一半数据，且隔一个取值，取够1/2的fftSize
		outBuffer[i]=~~Math.max(Math.abs(fftOut[j]),Math.abs(fftOut[j+1]));
	}
	return outBuffer;
};
var toDBFS=function(outBuffer){
	var arr=[];
	for(var i=0,L=outBuffer.length,v;i<L;i++){
		v=outBuffer[i]/FFT_N*4; //测试得出的，比较接近0x7FFF
		v=20*Math.log(Math.max(0.1,v)/0x7FFF)/Math.log(10);
		arr.push(Math.min(0,Math.max(-100,Math.round(v))));
	}
	return arr;
};

return {transform:getModulus,toDBFS:toDBFS,bufferSize:FFT_N};
};
