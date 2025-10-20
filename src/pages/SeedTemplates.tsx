import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SeedTemplates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

  const seedPromptTemplates = async (userId: string) => {
    const promptTemplates = [
      {
        user_id: userId,
        prompt_name: 'Literature Review Analyzer',
        prompt_description: 'Analyzes academic papers and generates comprehensive literature reviews with key findings and research gaps',
        prompt_outcome: '<p>Generate a structured literature review that identifies main themes, methodologies, and research gaps from academic sources</p>',
        prompt: `You are tasked with analyzing the provided academic papers and creating a comprehensive literature review. Focus on:
1. Main research themes and trends
2. Methodologies used across studies
3. Key findings and conclusions
4. Identified research gaps
5. Future research directions

Format the output with clear sections and citations.`,
        system_outcome: '<p>Act as an expert academic researcher with deep knowledge in systematic literature reviews and meta-analysis</p>',
        system_prompt: `You are an expert academic researcher specializing in literature reviews. Your role is to:
- Critically analyze research papers
- Identify patterns and trends across multiple studies
- Present information in a clear, academic style
- Maintain objectivity and cite sources accurately
- Highlight both consensus and contradictions in the literature`,
        prompt_model: 'google/gemini-2.5-flash',
        prompt_team: ['Research Team', 'Academic Analysis'],
        prompt_tags: ['literature-review', 'academic', 'analysis', 'research'],
        total_tokens: 1250,
        total_prompt_cost: 0.0045
      },
      {
        user_id: userId,
        prompt_name: 'Citation Extractor',
        prompt_description: 'Extracts and formats citations from research documents in multiple citation styles',
        prompt_outcome: '<p>Extract all citations from the provided document and format them according to the specified citation style (APA, MLA, Chicago, etc.)</p>',
        prompt: `Your task is to:
1. Identify all cited sources in the provided text
2. Extract complete citation information (authors, year, title, journal, etc.)
3. Format citations according to the requested style
4. Organize citations alphabetically
5. Flag any incomplete or malformed citations

Provide the output as a properly formatted reference list.`,
        system_outcome: '<p>Serve as a meticulous citation specialist with expertise in all major academic citation styles</p>',
        system_prompt: `You are a citation and bibliography specialist with expertise in:
- All major citation formats (APA, MLA, Chicago, Harvard, IEEE)
- Academic publishing standards
- Metadata extraction
- Citation accuracy verification
Your outputs must be precise and follow the latest edition guidelines.`,
        prompt_model: 'google/gemini-2.5-pro',
        prompt_team: ['Research Team', 'Documentation'],
        prompt_tags: ['citations', 'formatting', 'references', 'academic'],
        total_tokens: 850,
        total_prompt_cost: 0.0032
      },
      {
        user_id: userId,
        prompt_name: 'Research Gap Identifier',
        prompt_description: 'Identifies unexplored areas and potential research opportunities from existing literature',
        prompt_outcome: '<p>Analyze the research landscape and identify significant gaps, contradictions, and opportunities for future research</p>',
        prompt: `Based on the provided research papers, identify:
1. Areas lacking sufficient investigation
2. Contradictory findings that need resolution
3. Methodological limitations in existing studies
4. Emerging trends requiring further exploration
5. Practical applications that need research support

For each gap identified, provide:
- Brief description
- Why it matters
- Potential research questions
- Suggested methodological approaches`,
        system_outcome: '<p>Function as a strategic research advisor with the ability to see patterns and opportunities across research domains</p>',
        system_prompt: `You are a strategic research advisor with expertise in:
- Research trend analysis
- Gap identification
- Research question formulation
- Methodological design
- Cross-disciplinary connections
Your goal is to help researchers identify valuable and feasible research opportunities.`,
        prompt_model: 'openai/gpt-5-mini',
        prompt_team: ['Research Team', 'Strategy'],
        prompt_tags: ['research-gaps', 'opportunities', 'strategy', 'innovation'],
        total_tokens: 1100,
        total_prompt_cost: 0.0038
      }
    ];

    const { data, error } = await supabase
      .from('prompt_templates')
      .insert(promptTemplates)
      .select();

    if (error) throw error;
    return data;
  };

  const seedJobTemplates = async (userId: string, promptIds: string[]) => {
    const jobTemplates = [
      {
        user_id: userId,
        job_name: 'Systematic Literature Analysis',
        job_description: 'Comprehensive analysis of research papers from multiple databases to identify trends and gaps',
        job_connection: '1',
        job_prompt: promptIds[0],
        job_team: ['Research Team', 'Academic Analysis'],
        job_tags: ['systematic-review', 'literature', 'analysis'],
        research_type: 'Overall',
        research_depth: 'Deep Research',
        research_exactness: 'Precise',
        job_outcome: 'Data Type: Site Link, Chunking: true, Chunk Size: 20, Job Types: Scheduled, Recurring'
      },
      {
        user_id: userId,
        job_name: 'Citation Management Workflow',
        job_description: 'Automated extraction and formatting of citations from academic documents',
        job_connection: '2',
        job_prompt: promptIds[1],
        job_team: ['Research Team', 'Documentation'],
        job_tags: ['citations', 'automation', 'formatting'],
        research_type: 'Per Object',
        research_depth: 'Quick Research',
        research_exactness: 'Strict',
        job_outcome: 'Data Type: File, Chunking: false, Chunk Size: 20, Job Types: One-Time'
      },
      {
        user_id: userId,
        job_name: 'Research Opportunity Scanner',
        job_description: 'Continuous monitoring of research landscape to identify emerging gaps and opportunities',
        job_connection: '3',
        job_prompt: promptIds[2],
        job_team: ['Research Team', 'Strategy'],
        job_tags: ['opportunity', 'scanning', 'trends'],
        research_type: 'Data Synthesis',
        research_depth: 'Deep Research',
        research_exactness: 'Balanced',
        job_outcome: 'Data Type: Dynamic Search Fields, Chunking: true, Chunk Size: 30, Job Types: Scheduled, On-going'
      }
    ];

    const { data, error } = await supabase
      .from('job_templates')
      .insert(jobTemplates)
      .select();

    if (error) throw error;
    return data;
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to seed templates.",
          variant: "destructive",
        });
        return;
      }

      // Insert prompt templates
      const promptData = await seedPromptTemplates(userData.user.id);
      const promptIds = promptData.map(p => p.id);

      // Insert job templates
      await seedJobTemplates(userData.user.id, promptIds);

      toast({
        title: "Success!",
        description: "Created 3 prompt templates and 3 job templates.",
      });

      navigate("/blueprints");
    } catch (error) {
      console.error("Error seeding templates:", error);
      toast({
        title: "Error",
        description: "Failed to seed templates. They may already exist.",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Database}
        title="Seed Demo Templates"
        description="Generate dummy templates for testing"
      />

      <div className="w-full max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Generate Test Data</h2>
              <p className="text-muted-foreground">
                This will create 3 prompt templates and 3 job templates with realistic demo data 
                that you can view, edit, delete, and use.
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">What will be created:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Literature Review Analyzer (Prompt)</li>
                <li>• Citation Extractor (Prompt)</li>
                <li>• Research Gap Identifier (Prompt)</li>
                <li>• Systematic Literature Analysis (Job)</li>
                <li>• Citation Management Workflow (Job)</li>
                <li>• Research Opportunity Scanner (Job)</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button onClick={() => navigate("/blueprints")} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleSeed} disabled={isSeeding} className="flex-1">
                {isSeeding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Templates...
                  </>
                ) : (
                  'Generate Test Templates'
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SeedTemplates;
