'use client';

import ClubTypes from '@/components/marketing/ClubTypes';
import Finale from '@/components/marketing/Finale';
import HelpSection from '@/components/marketing/HelpSection';
import HeroScene from '@/components/marketing/HeroScene';
import MediaBreaks from '@/components/marketing/MediaBreaks';
import RoadmapSketches from '@/components/marketing/RoadmapSketches';
import RolePicker from '@/components/marketing/RolePicker';
import ToolQuiz from '@/components/marketing/ToolQuiz';
import TrustSection from '@/components/marketing/TrustSection';
import WeekStage from '@/components/marketing/WeekStage';

/**
 * Marketing homepage. Chapter order is the story (see README "Marketing homepage"): hero -> media breaks ->
 * a week in the club -> roles -> club types -> help & guides (docs portal) -> trust -> roadmap -> quiz -> finale. All copy and the live/planned
 * status of every feature come from `components/marketing/marketingData.ts` + the `Marketing*Translation.ts` files.
 */
export default function HomepagePageContent() {
    return (
        <div>
            <HeroScene />
            <MediaBreaks />
            <WeekStage />
            <RolePicker />
            <ClubTypes />
            <HelpSection />
            <TrustSection />
            <RoadmapSketches />
            <ToolQuiz />
            <Finale />
        </div>
    );
}
