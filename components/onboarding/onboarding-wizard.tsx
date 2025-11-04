"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useSession } from "@/store/useSession"
import { useUi } from "@/store/useUi"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { X, Plus } from "lucide-react"

const onboardingSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  bio: z.string().optional(),
  skills: z.array(z.string()).min(1, "Please add at least one skill"),
  socialLinks: z.object({
    github: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    discord: z.string().optional(),
    website: z.string().optional(),
  }),
  learningGoals: z.string().optional(),
})

type OnboardingData = z.infer<typeof onboardingSchema>

const SUGGESTED_SKILLS = [
  "React",
  "TypeScript",
  "Solana",
  "Rust",
  "JavaScript",
  "Python",
  "DeFi",
  "NFTs",
  "Smart Contracts",
  "UI/UX Design",
  "Figma",
  "Node.js",
  "Web3",
  "Blockchain",
]

export function OnboardingWizard() {
  const { user, setUser } = useSession()
  const { onboardingOpen, setOnboardingOpen } = useUi()
  const { execute } = useApi()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [newSkill, setNewSkill] = useState("")

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      bio: user?.bio || "",
      skills: user?.skills || [],
      socialLinks: user?.socialLinks || {},
      learningGoals: "",
    },
  })

  const skills = form.watch("skills")

  const addSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      form.setValue("skills", [...skills, skill])
    }
    setNewSkill("")
  }

  const removeSkill = (skillToRemove: string) => {
    form.setValue(
      "skills",
      skills.filter((skill) => skill !== skillToRemove),
    )
  }

  const onSubmit = async (data: OnboardingData) => {
    if (!user) return

    const result = await execute("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        ...data,
        onboardingCompleted: true,
      }),
    })

    if (result.success && result.data) {
      setUser(result.data)
      setOnboardingOpen(false)
      toast({
        title: "Welcome to ObeliskHub! 🎉",
        description: "You've earned 50 XP for completing your profile!",
      })
    }
  }

  const nextStep = () => {
    if (step < 5) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const progress = (step / 5) * 100

  return (
    <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Welcome to ObeliskHub!</DialogTitle>
          <DialogDescription>
            Let's set up your profile to get you started in the Solana builder community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {step} of 5</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="How should we call you?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Tell us a bit about yourself..." className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Your Skills</h3>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a skill..."
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addSkill(newSkill)
                          }
                        }}
                      />
                      <Button type="button" onClick={() => addSkill(newSkill)} size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                          {skill}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Suggested skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_SKILLS.filter((skill) => !skills.includes(skill)).map((skill) => (
                        <Badge key={skill} variant="outline" className="cursor-pointer" onClick={() => addSkill(skill)}>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Social Links</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="socialLinks.github"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GitHub</FormLabel>
                          <FormControl>
                            <Input placeholder="github.com/username" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.twitter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Twitter</FormLabel>
                          <FormControl>
                            <Input placeholder="@username" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.discord"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discord</FormLabel>
                          <FormControl>
                            <Input placeholder="username#1234" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Learning Goals</h3>
                  <FormField
                    control={form.control}
                    name="learningGoals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What do you want to learn or build?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share your goals and interests..."
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4 text-center">
                  <h3 className="text-lg font-semibold">You're all set! 🎉</h3>
                  <p className="text-muted-foreground">
                    Welcome to the ObeliskHub community! You'll earn 50 XP for completing your profile.
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-medium">{form.watch("displayName")}</p>
                    <p className="text-sm text-foreground">{skills.length} skills • Ready to build on Solana</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={prevStep} disabled={step === 1}>
                  Previous
                </Button>
                {step < 5 ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit">Complete Setup</Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
