import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  memoryMB: number;
}

interface SystemStats {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  uptime: {
    seconds: number;
    formatted: string;
  };
  load: number[];
  hostname: string;
  os: string;
  timestamp: string;
  topProcesses: ProcessInfo[];
}

async function getSystemStats(): Promise<SystemStats> {
  // Full paths for macOS commands
  const SYSCTL = '/usr/sbin/sysctl';
  const TOP = '/usr/bin/top';
  const VM_STAT = '/usr/bin/vm_stat';
  const DF = '/bin/df';
  const SW_VERS = '/usr/bin/sw_vers';
  const HOSTNAME = '/bin/hostname';

  // Get CPU info
  const { stdout: cpuInfo } = await execAsync(`${SYSCTL} -n machdep.cpu.brand_string`);
  const { stdout: cpuCores } = await execAsync(`${SYSCTL} -n hw.ncpu`);
  
  // Get CPU usage via top (1 sample)
  const { stdout: topOutput } = await execAsync(`${TOP} -l 1 -n 0 | grep "CPU usage"`);
  const cpuMatch = topOutput.match(/(\d+\.?\d*)% user.*?(\d+\.?\d*)% sys/);
  const cpuUsage = cpuMatch ? parseFloat(cpuMatch[1]) + parseFloat(cpuMatch[2]) : 0;

  // Get memory info
  const { stdout: memTotal } = await execAsync(`${SYSCTL} -n hw.memsize`);
  const { stdout: vmStat } = await execAsync(VM_STAT);
  
  const pageSize = 16384; // Apple Silicon default
  const freeMatch = vmStat.match(/Pages free:\s+(\d+)/);
  const activeMatch = vmStat.match(/Pages active:\s+(\d+)/);
  const inactiveMatch = vmStat.match(/Pages inactive:\s+(\d+)/);
  const wiredMatch = vmStat.match(/Pages wired down:\s+(\d+)/);
  const compressedMatch = vmStat.match(/Pages occupied by compressor:\s+(\d+)/);
  
  const totalMem = parseInt(memTotal) / (1024 * 1024 * 1024); // GB
  const freePages = parseInt(freeMatch?.[1] || '0');
  const activePages = parseInt(activeMatch?.[1] || '0');
  const inactivePages = parseInt(inactiveMatch?.[1] || '0');
  const wiredPages = parseInt(wiredMatch?.[1] || '0');
  const compressedPages = parseInt(compressedMatch?.[1] || '0');
  
  const usedMem = ((activePages + wiredPages + compressedPages) * pageSize) / (1024 * 1024 * 1024);
  const freeMem = totalMem - usedMem;

  // Get disk info
  const { stdout: dfOutput } = await execAsync(`${DF} -g / | tail -1`);
  const dfParts = dfOutput.trim().split(/\s+/);
  const diskTotal = parseInt(dfParts[1]) || 0;
  const diskUsed = parseInt(dfParts[2]) || 0;
  const diskFree = parseInt(dfParts[3]) || 0;
  const diskPercent = parseInt(dfParts[4]?.replace('%', '')) || 0;

  // Get uptime
  const { stdout: uptimeRaw } = await execAsync(`${SYSCTL} -n kern.boottime`);
  const bootMatch = uptimeRaw.match(/sec = (\d+)/);
  const bootTime = bootMatch ? parseInt(bootMatch[1]) : 0;
  const uptimeSeconds = Math.floor(Date.now() / 1000) - bootTime;
  
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptimeFormatted = days > 0 
    ? `${days}d ${hours}h ${minutes}m`
    : hours > 0 
      ? `${hours}h ${minutes}m`
      : `${minutes}m`;

  // Get load average
  const { stdout: loadAvg } = await execAsync(`${SYSCTL} -n vm.loadavg`);
  const loadMatch = loadAvg.match(/(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)/);
  const load = loadMatch 
    ? [parseFloat(loadMatch[1]), parseFloat(loadMatch[2]), parseFloat(loadMatch[3])]
    : [0, 0, 0];

  // Get hostname and OS
  const { stdout: hostname } = await execAsync(HOSTNAME);
  const { stdout: osVersion } = await execAsync(`${SW_VERS} -productVersion`);

  // Get top processes by memory
  const { stdout: psOutput } = await execAsync('ps -eo pid,pcpu,pmem,rss,comm | sort -k3 -rn | head -12');
  const psLines = psOutput.trim().split('\n').slice(1); // Skip header
  
  const topProcesses: ProcessInfo[] = psLines.map(line => {
    const parts = line.trim().split(/\s+/);
    const pid = parseInt(parts[0]) || 0;
    const cpu = parseFloat(parts[1]) || 0;
    const memPercent = parseFloat(parts[2]) || 0;
    const rssKB = parseInt(parts[3]) || 0;
    const fullPath = parts.slice(4).join(' ');
    
    // Extract just the app/process name from the full path
    let name = fullPath;
    if (fullPath.includes('.app/')) {
      const match = fullPath.match(/\/([^/]+\.app)\//);
      name = match ? match[1].replace('.app', '') : fullPath;
    } else if (fullPath.includes('/')) {
      name = fullPath.split('/').pop() || fullPath;
    }
    
    // Shorten known long names
    if (name.includes('Google Chrome Helper')) name = 'Chrome Tab';
    if (name.includes('com.apple.Virtualization')) name = 'Docker VM';
    if (name === 'com.docker.backend') name = 'Docker';
    if (name === 'next-server') name = 'Next.js Dev';
    
    return {
      pid,
      name,
      cpu: Math.round(cpu * 10) / 10,
      memory: Math.round(memPercent * 10) / 10,
      memoryMB: Math.round(rssKB / 1024),
    };
  }).filter(p => p.memoryMB > 50); // Only show processes using >50MB

  return {
    cpu: {
      usage: Math.round(cpuUsage * 10) / 10,
      cores: parseInt(cpuCores),
      model: cpuInfo.trim(),
    },
    memory: {
      total: Math.round(totalMem * 10) / 10,
      used: Math.round(usedMem * 10) / 10,
      free: Math.round(freeMem * 10) / 10,
      usagePercent: Math.round((usedMem / totalMem) * 100),
    },
    disk: {
      total: diskTotal,
      used: diskUsed,
      free: diskFree,
      usagePercent: diskPercent,
    },
    uptime: {
      seconds: uptimeSeconds,
      formatted: uptimeFormatted,
    },
    load,
    hostname: hostname.trim(),
    os: `macOS ${osVersion.trim()}`,
    timestamp: new Date().toISOString(),
    topProcesses,
  };
}

export async function GET() {
  try {
    const stats = await getSystemStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting system stats:', error);
    return NextResponse.json(
      { error: 'Failed to get system stats', details: String(error) },
      { status: 500 }
    );
  }
}
