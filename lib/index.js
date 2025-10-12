/**
 * NodeOS
 *
 * @copyright 2013-2025 Jacob Groundwater, Jesús Leganés-Combarro 'piranna'
 *  and other contributors
 *
 * @license MIT
**/

let dependancies = {};

let script_type = false; /* false for CommonJS, true for ECMAScript */

try {

    require.main;
    
} catch(err) {

    console.log(`NodeJS is using ECMAScript !`);
    script_type = true;
    
};

if (!script_type) {
    
    dependancies["fs"]               = await import("node:fs");
    dependancies["path"]             = await import("node:path");
    dependancies["child_process"]    = await import("node:child_process");
    dependancies["processArguments"] = await import("nodeos-barebones/scripts/processArguments");

    console.log(`NodeJS is using ECMAScript !`);
    
};
if (script_type) {

    dependancies["fs"]            = require("node:fs");
    dependancies["path"]          = require("node:path");
    dependancies["child_process"] = require("node:child_process");
    dependancies["processArguments"] = require("nodeos-barebones/scripts/processArguments");

    console.log(`NodeJS is using CommonJS !`);
    
};


function checkKvm(qemuBin) {
  
    let contents = "";

    try {
    
        contents = fs.readFileSync('/proc/cpuinfo');
    
    } catch(err) {
    
        if(e.code !== 'ENOENT') {
            
            throw(e);

        };

        return false;
    
    };

    if(! /(vmx|svm|0xc0f)/.test(contents)) {
        
        return false;
        
    };

    /* We have support for KVM, let's see if QEmu has permissions to use it */
    try {
        
        dependancies["child_process"].spawnSync(qemuBin, ['-nographic'], {timeout: 1000});
        
    } catch(err) {
    
        return true;
    
    };
  
};


function prepareCommandLine(argv, output) {
  
    const args = dependancies["processArguments"](argv),
          link = fs.readlinkSync('out/latest').split('/') || [];

    const cpu        = args.cpu,
          cpu_family = args.cpu_family || link[link.length-3],
          machine    = args.machine    || link[link.length-2],
          platform   = args.platform   || link[link.length-1];

    let command = 'qemu-system-'+cpu_family;

    argv = ['-machine', machine,'-m', '256M','-vga', 'std','-net', 'nic','-net', 'user,id=eth0,hostfwd=tcp::50080-:80','-net', 'user,id=eth1,hostfwd=tcp::50443-:443'];

    switch(output) {
        
        case 'curses'   :
            
            argv.push('-curses');
            break;
            
        case 'nographic':
            
            argv.push('-nographic');
            break;
        
    };

};

    // check if kvm is supported
let timeout_rate = 1;

function qemuKvm() {
    
    if (checkKvm(command)) {
      
        argv.push('-enable-kvm');
        timeout_rate = 0.1;
      
    };
    
};

// CWD
const cwd = dependancies["path"].join('out', cpu_family, machine, platform);

switch(platform) {
      
    case 'disk':
      
        qemuKvm();
        argv.push('-hda', 'disk.img');
        break;

    case 'docker':
        
        command = 'docker';
        argv = ['run','-it','--cap-add','SYS_ADMIN','--security-opt=apparmor:unconfined','--device', '/dev/fuse','nodeos/nodeos'/*, '-v', 'usersfs:/tmp'*/];
        break;

    case 'img':
      
        qemuKvm();
        argv.push('-hda','bootfs.img','-hdb','usersfs.img');
        break;

    case 'iso':
      
        qemuKvm();
        argv.push('-cdrom','bootfs.iso','-hda','usersfs.img');
        break;

    case 'qemu':
      
        qemuKvm();
        const append = ['root=/dev/sda', 'ip=dhcp'];

        switch(output) {
            
            case 'nographic':
                
                append.push('console=ttyS0'); // redirect to terminal
                break;

            case 'curses':
            
                append.push('vga=extended'); // 80x50
                break;

            default:
                
                append.push('vga=0x344'); // 1024x768x32
            
        };

        argv.push('--kernel', 'kernel', '--initrd', 'initramfs.cpio.gz', '-drive',   `file=usersfs.img,format=raw,index=0`, '-append', append.join(' '));
        break;

    case 'tar':
            
    case 'vagga':
        
        break;

    default:
                
        throw 'Unknown platform "'+platform+'"';
    
    return {command, argv, cwd, platform, timeout_rate};
    
};

module.exports = prepareCommandLine;
