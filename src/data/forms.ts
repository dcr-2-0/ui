export interface FormItem {
  id: number;
  title: string;
  icon: string;
  description: string;
  googleFormUrl: string;
  status?: 'active' | 'coming_soon';
}

export const forms: FormItem[] = [
  {
    id: 1,
    title: 'Suggest new item',
    icon: '💡',
    description:
      'Suggest new certifications, courses, or achievements to be added to the DCR system.',
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSc_XNTL4AI8mYer5aiveY7y0sQz9S4fr_lb6Ji2I2QyqXl7WQ/viewform?embedded=true',
  },
  {
    id: 2,
    title: 'Announce certification-circle',
    icon: '👥',
    description:
      'Announce and organize certification study groups with colleagues for bonus points.',
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSdP11n2qWK6LJMlVbrlrSWDgSWeTmllnWy3DyGQNG5dBks9zA/viewform?embedded=true',
  },
];
