/* This file was written by Bill Cox in 2011, and is licensed under the Apache
   2.0 license. */

import java.util.Scanner;
import java.io.File;
import java.io.IOException;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.DataLine;
import javax.sound.sampled.LineUnavailableException;
import javax.sound.sampled.SourceDataLine;
import javax.sound.sampled.UnsupportedAudioFileException;

public class Main {

    // Run sonic.
    private static void runSonic(
        AudioInputStream audioStream,
        SourceDataLine line,
        float speed,
        float pitch,
        float rate,
        float volume,
        boolean emulateChordPitch,
        int quality,
        int sampleRate,
        int numChannels) throws IOException
    {
        Sonic sonic = new Sonic(sampleRate, numChannels);
        int bufferSize = line.getBufferSize();
        byte inBuffer[] = new byte[bufferSize];
        byte outBuffer[] = new byte[bufferSize];
        int numRead, numWritten;

        sonic.setSpeed(speed);
        sonic.setPitch(pitch);
        sonic.setRate(rate);
        sonic.setVolume(volume);
        sonic.setChordPitch(emulateChordPitch);
        sonic.setQuality(quality);
        do {
            numRead = audioStream.read(inBuffer, 0, bufferSize);
            if(numRead <= 0) {
                sonic.flushStream();
            } else {
                sonic.writeBytesToStream(inBuffer, numRead);
            }
            do {
                numWritten = sonic.readBytesFromStream(outBuffer, bufferSize);
                if(numWritten > 0) {
                    line.write(outBuffer, 0, numWritten);
                }
            } while(numWritten > 0);
        } while(numRead > 0);
    }

    public static void main(
    	String[] argv) throws UnsupportedAudioFileException, IOException, LineUnavailableException
    {
		Scanner input=new Scanner(System.in);
		
		System.out.println("【即将播放test.wav文件】");
		System.out.println("【开始输入配置值】请填写0.1-2.0的数字，1.0为不调整，当然超过2.0也是可以的");
		
		System.out.print("请输入speed(变速不变调):");
        float speed = input.nextFloat();
		System.out.print("请输入pitch(变调不变速):");
        float pitch = input.nextFloat();
		System.out.print("请输入rate(变速变调):");
        float rate = input.nextFloat();
		System.out.print("请输入volume(调整音量):");
        float volume = input.nextFloat();
		
        boolean emulateChordPitch = false;
        int quality = 0;
        
        AudioInputStream stream = AudioSystem.getAudioInputStream(new File("test.wav"));
        AudioFormat format = stream.getFormat();
        int sampleRate = (int)format.getSampleRate();
        int numChannels = format.getChannels(); 
        SourceDataLine.Info info = new DataLine.Info(SourceDataLine.class, format,
        	((int)stream.getFrameLength()*format.getFrameSize()));
        SourceDataLine line = (SourceDataLine)AudioSystem.getLine(info);
        line.open(stream.getFormat());
        line.start();
        runSonic(stream, line, speed, pitch, rate, volume, emulateChordPitch, quality,
            sampleRate, numChannels);
        line.drain();
        line.stop();
    }
}