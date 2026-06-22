package com.bandlogic.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Custom entry activity. Requests the microphone permission at launch so the
 * in-app recorder (Web MediaRecorder / getUserMedia inside the Capacitor
 * WebView) can capture audio. The GitHub Actions workflow copies this file over
 * the auto-generated MainActivity after `npx cap add android`.
 */
public class MainActivity extends BridgeActivity {
    private static final int MIC_PERMISSION_REQUEST = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                new String[]{ Manifest.permission.RECORD_AUDIO },
                MIC_PERMISSION_REQUEST
            );
        }
    }
}
