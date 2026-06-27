package com.aura.service;

import java.io.File;
import java.io.IOException;

public class PythonResolver {

    private static String cachedPythonCmd = null;

    public static synchronized String resolvePythonCommand() {
        if (cachedPythonCmd != null) {
            return cachedPythonCmd;
        }

        String userDir = System.getProperty("user.dir");
        File projectRoot = userDir.endsWith("backend") ? new File(userDir).getParentFile() : new File(userDir);

        // 1. Check for local virtual environment (.venv or venv)
        String[] venvNames = {".venv", "venv"};
        boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");

        for (String venvName : venvNames) {
            File venvDir = new File(projectRoot, venvName);
            if (venvDir.exists() && venvDir.isDirectory()) {
                File pythonExec = isWindows 
                    ? new File(venvDir, "Scripts/pythonw.exe") 
                    : new File(venvDir, "bin/python");
                if (pythonExec.exists() && pythonExec.isFile()) {
                    cachedPythonCmd = pythonExec.getAbsolutePath();
                    System.out.println("[AURA] Using virtual environment python: " + cachedPythonCmd);
                    return cachedPythonCmd;
                }
            }
        }

        // 2. Check system commands: pyw, pythonw, py, python (prioritize windowless launchers on Windows)
        String[] systemCmds = isWindows 
            ? new String[]{"pyw", "pythonw", "py", "python"} 
            : new String[]{"python3", "python", "py"};
        for (String cmd : systemCmds) {
            if (isCommandAvailable(cmd)) {
                cachedPythonCmd = cmd;
                System.out.println("[AURA] Using system python command: " + cmd);
                return cachedPythonCmd;
            }
        }

        // Fallback to python3
        System.err.println("[AURA] Warning: No python command found in virtual environment or PATH. Defaulting to 'python3'.");
        cachedPythonCmd = "python3";
        return cachedPythonCmd;
    }

    private static boolean isCommandAvailable(String cmd) {
        try {
            Process process = new ProcessBuilder(cmd, "--version").start();
            process.waitFor();
            return true;
        } catch (IOException | InterruptedException e) {
            return false;
        }
    }
}
