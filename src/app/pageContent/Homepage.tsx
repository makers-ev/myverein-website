"use client";

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomepagePageContent() {
    const { t } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Triggers the CSS fade-in transition below on next paint after mount --
        // not syncing with an external system, so this is the documented
        // "trigger an animation" exception to react-hooks/set-state-in-effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsVisible(true);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-primary/10 flex items-center justify-center p-4">
            <div className="max-w-4xl mx-auto text-center">
                {/* Animated Hero Section */}
                <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6">
                        {t('home.title')}
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
                        {t('home.info')}
                    </p>
                </div>

                {/* Feature Cards */}
                <div className="grid md:grid-cols-3 gap-6 mt-12">
                    {[
                        { title: 'Email & Password', description: 'Sign up and sign in with Better Auth\'s built-in credential flow.', icon: '🔐' },
                        { title: 'Two-Factor Auth', description: 'TOTP-based 2FA, ready to enable per account.', icon: '📱' },
                        { title: 'Admin Panel', description: 'Role-based access control with an admin plugin out of the box.', icon: '🛡️' },
                    ].map((feature, index) => (
                        <div
                            key={feature.title}
                            className={`bg-card rounded-lg shadow-lg p-6 transform transition-all duration-700 hover:scale-105 hover:shadow-xl ${
                                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                            }`}
                            style={{ transitionDelay: `${index * 200}ms` }}
                        >
                            <div className="text-4xl mb-4">{feature.icon}</div>
                            <h3 className="text-xl font-semibold text-card-foreground mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground">{feature.description}</p>
                        </div>
                    ))}
                </div>

                {/* Call to Action */}
                <div className={`mt-12 transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <a
                        href="/login-signup"
                        className="inline-block bg-primary hover:brightness-110 text-primary-foreground font-semibold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                    >
                        Get Started
                    </a>
                </div>
            </div>
        </div>
    );
}
