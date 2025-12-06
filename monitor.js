// Visitor Monitoring System for Static Sites
// Sends visitor information to Discord webhook

// Discord webhook URL
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1446736886314827836/4jt7NTv9R0vxmwavRGjKpTxSDBdAmSHRafgdT0QfJJzzkG3q0QQXdqgJ4X_nVvg8oppk';

// Track if we've already sent a notification this session
let notificationSent = sessionStorage.getItem('visitor_tracked') === 'true';

async function getVisitorInfo() {
    const info = {
        // Basic browser info
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages?.join(', ') || navigator.language,
        platform: navigator.platform,
        vendor: navigator.vendor,
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        
        // Screen info
        screenWidth: screen.width,
        screenHeight: screen.height,
        screenColorDepth: screen.colorDepth,
        screenPixelDepth: screen.pixelDepth,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        
        // Time info
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        localTime: new Date().toLocaleString(),
        utcTime: new Date().toUTCString(),
        
        // Page info
        pageURL: window.location.href,
        referrer: document.referrer || 'Direct visit',
        
        // Connection info (if available)
        connectionType: navigator.connection?.effectiveType || 'Unknown',
        connectionDownlink: navigator.connection?.downlink || 'Unknown',
        
        // Hardware info
        hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
        deviceMemory: navigator.deviceMemory || 'Unknown',
        maxTouchPoints: navigator.maxTouchPoints || 0,
        
        // Battery info (async, handled separately)
        battery: null
    };

    // Try to get battery info
    try {
        if (navigator.getBattery) {
            const battery = await navigator.getBattery();
            info.battery = {
                charging: battery.charging,
                level: Math.round(battery.level * 100) + '%',
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime
            };
        }
    } catch (e) {
        info.battery = 'Not available';
    }

    return info;
}

async function getIPInfo() {
    // Try multiple APIs for better accuracy and more data
    const apis = [
        {
            url: 'https://ipwho.is/',
            transform: (data) => ({
                ip: data.ip,
                city: data.city,
                region: data.region,
                country: data.country,
                country_code: data.country_code,
                lat: data.latitude,
                lon: data.longitude,
                isp: data.connection?.isp,
                org: data.connection?.org,
                asn: data.connection?.asn,
                timezone: data.timezone?.id
            })
        },
        {
            url: 'https://ipapi.co/json/',
            transform: (data) => data
        },
        {
            url: 'https://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query',
            transform: (data) => ({
                ip: data.query,
                city: data.city,
                region: data.regionName,
                country: data.country,
                lat: data.lat,
                lon: data.lon,
                isp: data.isp,
                org: data.org,
                timezone: data.timezone
            })
        }
    ];

    for (const api of apis) {
        try {
            const response = await fetch(api.url);
            if (response.ok) {
                const data = await response.json();
                if (data && !data.error) {
                    return api.transform(data);
                }
            }
        } catch (e) {
            console.log(`API ${api.url} failed, trying next...`);
        }
    }
    
    return null;
}

function formatDiscordMessage(visitorInfo, ipInfo) {
    const timestamp = new Date().toISOString();
    
    // Parse user agent for readable info
    const ua = visitorInfo.userAgent;
    let browser = 'Unknown';
    let browserVersion = '';
    let os = 'Unknown';
    
    // Better browser detection with version
    if (ua.includes('Edg/')) {
        browser = 'Edge';
        browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || '';
    } else if (ua.includes('Chrome/')) {
        browser = 'Chrome';
        browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || '';
    } else if (ua.includes('Firefox/')) {
        browser = 'Firefox';
        browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || '';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
        browser = 'Safari';
        browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || '';
    } else if (ua.includes('Opera') || ua.includes('OPR/')) {
        browser = 'Opera';
        browserVersion = ua.match(/(?:Opera|OPR)\/([\d.]+)/)?.[1] || '';
    }
    
    // Better OS detection
    if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
    else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
    else if (ua.includes('Windows NT 6.2')) os = 'Windows 8';
    else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS X')) {
        const version = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
        os = version ? `macOS ${version}` : 'macOS';
    }
    else if (ua.includes('Android')) {
        const version = ua.match(/Android ([\d.]+)/)?.[1] || '';
        os = version ? `Android ${version}` : 'Android';
    }
    else if (ua.includes('iPhone') || ua.includes('iPad')) {
        const version = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
        os = version ? `iOS ${version}` : 'iOS';
    }
    else if (ua.includes('Linux')) os = 'Linux';
    
    // Format connection info better
    let connectionInfo = 'Not available';
    if (visitorInfo.connectionType !== 'Unknown' || visitorInfo.connectionDownlink !== 'Unknown') {
        const type = visitorInfo.connectionType !== 'Unknown' ? visitorInfo.connectionType : 'N/A';
        const speed = visitorInfo.connectionDownlink !== 'Unknown' ? `${visitorInfo.connectionDownlink} Mbps` : 'N/A';
        connectionInfo = `Type: ${type} | Speed: ${speed}`;
    }
    
    // Format hardware info better
    const cores = visitorInfo.hardwareConcurrency !== 'Unknown' ? visitorInfo.hardwareConcurrency : 'N/A';
    const ram = visitorInfo.deviceMemory !== 'Unknown' ? `${visitorInfo.deviceMemory}GB` : 'N/A';
    const hardwareInfo = `Cores: ${cores} | RAM: ${ram}`;

    const embed = {
        title: '👀 New Resume Viewer!',
        color: 0x00ff00, // Green
        timestamp: timestamp,
        thumbnail: {
            url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        },
        fields: [
            {
                name: '🌍 Location',
                value: ipInfo ? `${ipInfo.city || 'Unknown'}, ${ipInfo.region || ipInfo.regionName || 'Unknown'}, ${ipInfo.country || ipInfo.country_name || 'Unknown'}` : 'Could not determine',
                inline: true
            },
            {
                name: '🌐 IP Address',
                value: ipInfo ? `\`${ipInfo.ip || ipInfo.query || 'Unknown'}\`` : 'Unknown',
                inline: true
            },
            {
                name: '🏢 ISP/Org',
                value: ipInfo ? (ipInfo.isp || ipInfo.org || 'Unknown') : 'Unknown',
                inline: true
            },
            {
                name: '💻 Browser',
                value: browserVersion ? `${browser} ${browserVersion.split('.')[0]}` : browser,
                inline: true
            },
            {
                name: '🖥️ OS',
                value: os,
                inline: true
            },
            {
                name: '📱 Device',
                value: visitorInfo.maxTouchPoints > 0 ? 'Mobile/Touch' : 'Desktop',
                inline: true
            },
            {
                name: '📐 Screen',
                value: `${visitorInfo.screenWidth}x${visitorInfo.screenHeight} @${visitorInfo.devicePixelRatio}x`,
                inline: true
            },
            {
                name: '🪟 Window',
                value: `${visitorInfo.windowWidth}x${visitorInfo.windowHeight}`,
                inline: true
            },
            {
                name: '⏰ Timezone',
                value: visitorInfo.timezone,
                inline: true
            },
            {
                name: '🔗 Referrer',
                value: visitorInfo.referrer.substring(0, 100) || 'Direct',
                inline: false
            },
            {
                name: '🔌 Connection',
                value: connectionInfo,
                inline: false
            },
            {
                name: '⚙️ Hardware',
                value: hardwareInfo,
                inline: true
            },
            {
                name: '🔋 Battery',
                value: visitorInfo.battery && typeof visitorInfo.battery === 'object' 
                    ? `${visitorInfo.battery.level} (${visitorInfo.battery.charging ? 'Charging' : 'Not charging'})`
                    : 'Not available',
                inline: true
            },
            {
                name: '🗣️ Language',
                value: visitorInfo.languages,
                inline: true
            }
        ],
        footer: {
            text: `Resume Viewer Analytics | ${visitorInfo.localTime}`
        }
    };

    // Add coordinates if available
    if (ipInfo && ipInfo.lat && ipInfo.lon) {
        embed.fields.push({
            name: '📍 Coordinates',
            value: `[${ipInfo.lat}, ${ipInfo.lon}](https://www.google.com/maps?q=${ipInfo.lat},${ipInfo.lon})`,
            inline: true
        });
    }

    return {
        username: 'Resume Monitor',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        embeds: [embed]
    };
}

async function sendToDiscord(payload) {
    if (DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
        console.warn('⚠️ Discord webhook URL not configured! Please update DISCORD_WEBHOOK_URL in monitor.js');
        return false;
    }

    try {
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            console.log('✅ Visitor notification sent to Discord');
            return true;
        } else {
            console.error('❌ Failed to send notification:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Error sending to Discord:', error);
        return false;
    }
}

async function trackVisitor() {
    // Only track once per session
    if (notificationSent) {
        console.log('Visitor already tracked this session');
        return;
    }

    try {
        // Gather all info in parallel
        const [visitorInfo, ipInfo] = await Promise.all([
            getVisitorInfo(),
            getIPInfo()
        ]);

        // Format and send to Discord
        const payload = formatDiscordMessage(visitorInfo, ipInfo);
        const success = await sendToDiscord(payload);
        
        if (success) {
            sessionStorage.setItem('visitor_tracked', 'true');
            notificationSent = true;
        }
    } catch (error) {
        console.error('Error tracking visitor:', error);
    }
}

// Start tracking when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackVisitor);
} else {
    trackVisitor();
}

// Also track download button clicks
document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.querySelector('.download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            const payload = {
                username: 'Resume Monitor',
                avatar_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                embeds: [{
                    title: '📥 Resume Downloaded!',
                    color: 0x0099ff,
                    description: 'Someone just downloaded your resume!',
                    timestamp: new Date().toISOString()
                }]
            };
            await sendToDiscord(payload);
        });
    }
});
